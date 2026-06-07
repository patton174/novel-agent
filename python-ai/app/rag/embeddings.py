"""Text embeddings — independent provider from chat LLM."""

from __future__ import annotations

import hashlib
import logging
import math
from collections.abc import Sequence

from app.config import settings

logger = logging.getLogger(__name__)

_EMBED_DIM = 384


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

    provider = (settings.rag_embed_provider or "openai").strip().lower()

    if provider == "openai":
        try:
            from langchain_openai import OpenAIEmbeddings

            api_key = (settings.rag_embed_api_key or "").strip()
            if not api_key:
                raise RuntimeError("RAG_EMBED_API_KEY not configured")
            base_url = (settings.rag_embed_base_url or "").strip() or None
            emb = OpenAIEmbeddings(
                api_key=api_key,
                base_url=base_url,
                model=settings.rag_embed_model or "text-embedding-3-small",
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


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (na * nb)
