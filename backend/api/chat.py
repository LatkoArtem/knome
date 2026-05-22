import json
from typing import Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from agents.onboarding import INITIAL_GREETING, create_onboarding_agent
from agents.orchestrator import create_orchestrator
from graph.queries import user_exists, get_user

router = APIRouter()

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


@router.websocket("/ws/chat/{user_id}")
async def websocket_chat(websocket: WebSocket, user_id: str):
    await websocket.accept()

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
            greeting = f"З поверненням, {name}! Чим можу допомогти?" if name else "З поверненням! Чим можу допомогти?"
            await websocket.send_json({"text": greeting})
        else:
            _sessions[user_id] = _init_session()
            await websocket.send_json({"text": INITIAL_GREETING})

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            user_text = data.get("text", "").strip()
            if not user_text:
                continue

            session = _sessions[user_id]

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
                payload: Dict[str, Any] = {"text": result["response"]}
                if result["phase"] == "done" and result.get("saved"):
                    payload["onboarding_complete"] = True
                    payload["user_id"] = user_id
                await websocket.send_json(payload)

            else:
                # Main chat — orchestrator
                orchestrator = _get_orchestrator()
                result = await orchestrator.ainvoke({
                    "user_id": user_id,
                    "user_message": user_text,
                    "domain": "",
                    "graph_context": {},
                    "response": "",
                    "graph_updates": [],
                })
                await websocket.send_json({"text": result["response"]})

    except WebSocketDisconnect:
        pass
