"""Lightweight text embeddings with optional OpenAI-compatible API."""

from __future__ import annotations

import hashlib
import logging
import math
from typing import Sequence

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
    try:
        from app.core.llm import llm_provider

        if llm_provider.is_configured:
            from langchain_openai import OpenAIEmbeddings

            cfg = settings.get_active_llm_config()
            embeddings = OpenAIEmbeddings(
                api_key=cfg.get("api_key") or "dummy",
                base_url=cfg.get("base_url"),
                model="text-embedding-3-small",
            )
            return await embeddings.aembed_documents(list(texts))
    except Exception as exc:
        logger.debug("embedding API unavailable, using hash fallback: %s", exc)
    return [_hash_embed(t) for t in texts]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (na * nb)
