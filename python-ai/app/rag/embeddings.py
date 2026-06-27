"""Text embeddings — independent provider from chat LLM."""

from __future__ import annotations

import hashlib
import logging
import math
from collections.abc import Sequence
from urllib.parse import urlencode

from app.config import settings

logger = logging.getLogger(__name__)

_EMBED_DIM = 384
_MINIMAX_DEFAULT_MODEL = "embo-01"
_OPENAI_DEFAULT_MODEL = "text-embedding-3-small"


def _resolve_embed_api_key() -> str:
    return (settings.rag_embed_api_key or settings.openai_api_key or "").strip()


def _resolve_embed_base_url() -> str | None:
    explicit = (settings.rag_embed_base_url or "").strip()
    if explicit:
        return explicit
    chat_url = (settings.openai_base_url or "").strip()
    if "minimaxi.com/anthropic" in chat_url:
        return "https://api.minimaxi.com/v1"
    return chat_url or None


def _is_minimax_base_url(base_url: str | None) -> bool:
    if not base_url:
        return False
    return "api.minimaxi.com" in base_url or "api.minimax.io" in base_url


def _resolve_minimax_embed_url(base_url: str | None) -> str:
    root = (base_url or "https://api.minimaxi.com/v1").rstrip("/")
    if root.endswith("/embeddings"):
        return root
    return f"{root}/embeddings"


def _resolve_minimax_model() -> str:
    model = (settings.rag_embed_model or "").strip()
    if not model or model == _OPENAI_DEFAULT_MODEL:
        return _MINIMAX_DEFAULT_MODEL
    return model


def _hash_embed(text: str, dim: int = _EMBED_DIM) -> list[float]:
    vec = [0.0] * dim
    if not text:
        return vec
    tokens = [text[i : i + 2] for i in range(max(len(text) - 1, 1))]
    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        idx = int.from_bytes(digest[:4], "big") % dim
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vec[idx] += sign
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


async def embed_texts(texts: Sequence[str]) -> list[list[float]]:
    if not texts:
        return []

    from app.core.model_registry import model_registry

    embed_cfg = model_registry.try_get("embedding")
    provider = (
        (embed_cfg or {}).get("provider") or (settings.rag_embed_provider or "openai")
    ).strip().lower()

    if provider in {"minimax", "minimaxi"}:
        try:
            return await _embed_minimax(
                list(texts),
                embed_type="db",
                api_key=(embed_cfg or {}).get("api_key"),
                model=(embed_cfg or {}).get("model_name"),
                base_url=(embed_cfg or {}).get("base_url"),
            )
        except Exception as exc:
            logger.error("embedding provider failed: %s", exc)
            if settings.rag_embed_fail_fast:
                raise RuntimeError(f"embedding unavailable: {exc}") from exc
            return [_hash_embed(t) for t in texts]

    if provider == "openai":
        try:
            from langchain_openai import OpenAIEmbeddings

            api_key = (embed_cfg or {}).get("api_key") or _resolve_embed_api_key()
            if not api_key:
                raise RuntimeError("RAG_EMBED_API_KEY not configured")
            base_url = (embed_cfg or {}).get("base_url") or _resolve_embed_base_url()
            if _is_minimax_base_url(base_url):
                return await _embed_minimax(list(texts), embed_type="db", base_url=base_url)
            embed_model = (embed_cfg or {}).get("model_name") or settings.rag_embed_model or _OPENAI_DEFAULT_MODEL
            emb = OpenAIEmbeddings(
                api_key=api_key,
                base_url=base_url,
                model=embed_model,
            )
            return await emb.aembed_documents(list(texts))
        except Exception as exc:
            logger.error("embedding provider failed: %s", exc)
            if settings.rag_embed_fail_fast:
                raise RuntimeError(f"embedding unavailable: {exc}") from exc
            return [_hash_embed(t) for t in texts]

    if provider == "disabled":
        return [_hash_embed(t) for t in texts]

    raise RuntimeError(f"unknown rag_embed_provider: {provider}")


async def _embed_minimax(
    texts: list[str],
    *,
    embed_type: str,
    base_url: str | None = None,
    api_key: str | None = None,
    model: str | None = None,
) -> list[list[float]]:
    import httpx

    resolved_key = (api_key or _resolve_embed_api_key()).strip()
    if not resolved_key:
        raise RuntimeError("RAG_EMBED_API_KEY not configured")

    url = _resolve_minimax_embed_url(base_url or _resolve_embed_base_url())
    group_id = (
        getattr(settings, "minimax_group_id", "")
        or getattr(settings, "rag_embed_group_id", "")
        or ""
    ).strip()
    if group_id:
        separator = "&" if "?" in url else "?"
        url = f"{url}{separator}{urlencode({'GroupId': group_id})}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            url,
            headers={"Authorization": f"Bearer {resolved_key}"},
            json={
                "model": (model or _resolve_minimax_model()).strip(),
                "type": embed_type,
                "texts": texts,
            },
        )
        response.raise_for_status()
    payload = response.json()
    base_resp = payload.get("base_resp")
    if isinstance(base_resp, dict) and base_resp.get("status_code") not in (None, 0):
        raise RuntimeError(
            "MiniMax embedding error "
            f"{base_resp.get('status_code')}: {base_resp.get('status_msg')}"
        )
    vectors = payload.get("vectors")
    if not isinstance(vectors, list) or len(vectors) != len(texts):
        raise RuntimeError("MiniMax embedding response missing vectors")
    return vectors


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (na * nb)
