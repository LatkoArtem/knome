"""
Ollama LLM client with transparent fallback.
Returns None on any error so callers can fall back to rule-based responses.
"""
import logging
from typing import Optional, AsyncIterator

from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "qwen2.5:7b"
VISION_MODEL = "llava"

_clients: dict[str, ChatOllama] = {}


def _get_client(model: str) -> ChatOllama:
    if model not in _clients:
        _clients[model] = ChatOllama(
            model=model,
            base_url=_BASE_URL,
            temperature=0.7,
            num_predict=256,
            timeout=10,
        )
    return _clients[model]


async def llm_respond(
    system: str,
    user: str,
    model: str = DEFAULT_MODEL,
) -> Optional[str]:
    """Call Ollama and return the full text response, or None if unavailable."""
    try:
        client = _get_client(model)
        result = await client.ainvoke([
            SystemMessage(content=system),
            HumanMessage(content=user),
        ])
        text = result.content.strip()
        return text if text else None
    except Exception as exc:
        logger.debug("Ollama unavailable (%s), using rule-based fallback", exc)
        return None


async def llm_stream(
    system: str,
    user: str,
    model: str = DEFAULT_MODEL,
) -> AsyncIterator[str]:
    """
    Stream tokens from Ollama one by one.
    Yields empty string on error so caller can fall back gracefully.
    """
    try:
        client = _get_client(model)
        async for chunk in client.astream([
            SystemMessage(content=system),
            HumanMessage(content=user),
        ]):
            token = chunk.content
            if token:
                yield token
    except Exception as exc:
        logger.debug("Ollama stream unavailable (%s)", exc)
        return


async def is_available(model: str = DEFAULT_MODEL) -> bool:
    """Quick health-check — returns True only if Ollama responds."""
    result = await llm_respond("Reply with the single word: ok", "ping", model=model)
    return result is not None
