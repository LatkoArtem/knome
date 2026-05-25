import asyncio
import json
import logging
import unicodedata
from typing import Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

from agents.onboarding import INITIAL_GREETING, create_onboarding_agent
from agents.orchestrator import create_orchestrator
from graph.queries import user_exists, get_user
from triggers.store import pop_pending
from triggers.engine import register_connection, unregister_connection

router = APIRouter()

_UNSUPPORTED_LANG_MSG = "Вибачте, я розумію лише українську та англійську мови."


def _is_supported_language(text: str) -> bool:
    """Return False if the message contains >25% chars outside Cyrillic/Latin."""
    meaningful = [
        ch for ch in text
        if not unicodedata.category(ch).startswith("Z")  # not whitespace
        and unicodedata.category(ch) not in ("Nd", "No", "Nl")  # not digits
        and unicodedata.category(ch) not in ("Po", "Ps", "Pe", "Pi", "Pf", "Pd", "Pc")  # not punctuation
        and unicodedata.category(ch) != "So"  # not emoji/symbols
    ]
    if not meaningful:
        return True
    other = sum(
        1 for ch in meaningful
        if unicodedata.category(ch).startswith("L")
        and not ("Ѐ" <= ch <= "ӿ")  # Cyrillic
        and not ("A" <= ch <= "Z" or "a" <= ch <= "z")  # Latin
    )
    return (other / len(meaningful)) <= 0.25

_sessions: Dict[str, Dict[str, Any]] = {}
_onboarding_agent = None
_orchestrator = None


def _get_onboarding_agent():
    global _onboarding_agent
    if _onboarding_agent is None:
        _onboarding_agent = create_onboarding_agent()
    return _onboarding_agent


def _get_orchestrator():
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = create_orchestrator()
    return _orchestrator


def _init_session() -> Dict[str, Any]:
    return {
        "phase": "greeting",
        "name": "",
        "goals": [],
        "context_goal_index": 0,
        "context_answers": {},
        "saved": False,
    }


async def _stream_text(websocket: WebSocket, text: str, extra: Dict[str, Any] | None = None) -> None:
    """Stream text word-by-word, then send done signal."""
    words = text.split(" ")
    for i, word in enumerate(words):
        token = word if i == len(words) - 1 else word + " "
        await websocket.send_json({"token": token})
        await asyncio.sleep(0.03)
    done_payload: Dict[str, Any] = {"done": True}
    if extra:
        done_payload.update(extra)
    await websocket.send_json(done_payload)


@router.websocket("/ws/chat/{user_id}")
async def websocket_chat(websocket: WebSocket, user_id: str):
    await websocket.accept()
    register_connection(user_id, websocket)

    if user_id not in _sessions:
        if user_exists(user_id):
            user = get_user(user_id)
            name = user["name"] if user else ""
            _sessions[user_id] = {
                "phase": "done",
                "name": name,
                "goals": [],
                "context_goal_index": 0,
                "context_answers": {},
                "saved": True,
            }
            # Existing user — connect silently, no auto-greeting
        else:
            _sessions[user_id] = _init_session()
            await _stream_text(websocket, INITIAL_GREETING)

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            user_text = data.get("text", "").strip()
            if not user_text:
                continue

            session = _sessions[user_id]

            if not _is_supported_language(user_text):
                await _stream_text(websocket, _UNSUPPORTED_LANG_MSG)
                continue

            if session["phase"] != "done":
                # Onboarding flow
                agent = _get_onboarding_agent()
                state_in = {
                    "user_id": user_id,
                    "user_message": user_text,
                    "phase": session["phase"],
                    "name": session["name"],
                    "goals": session["goals"],
                    "context_goal_index": session["context_goal_index"],
                    "context_answers": session["context_answers"],
                    "response": "",
                    "saved": session["saved"],
                }
                result = await agent.ainvoke(state_in)
                _sessions[user_id] = {
                    "phase": result["phase"],
                    "name": result.get("name") or session["name"],
                    "goals": result.get("goals") or session["goals"],
                    "context_goal_index": result.get("context_goal_index", session["context_goal_index"]),
                    "context_answers": result.get("context_answers") or session["context_answers"],
                    "saved": result.get("saved", session["saved"]),
                }
                extra = None
                if result["phase"] == "done" and result.get("saved"):
                    extra = {"onboarding_complete": True, "user_id": user_id}
                await _stream_text(websocket, result["response"], extra=extra)

            else:
                # Main chat — orchestrator
                try:
                    orchestrator = _get_orchestrator()
                    result = await orchestrator.ainvoke({
                        "user_id": user_id,
                        "user_message": user_text,
                        "domain": "",
                        "graph_context": {},
                        "response": "",
                        "graph_updates": [],
                    })
                    await _stream_text(websocket, result["response"])
                except Exception as exc:
                    logger.exception("Orchestrator error for user %s: %s", user_id, exc)
                    await _stream_text(websocket, "Вибач, сталася внутрішня помилка. Спробуй ще раз.")

    except WebSocketDisconnect:
        pass
    finally:
        unregister_connection(user_id)
