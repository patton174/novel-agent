"""Knowledge graph query helpers."""

from __future__ import annotations

from app.kg.store import get_subgraph


def character_graph(novel_id: str, character: str, *, depth: int = 1) -> dict[str, list]:
    """Return nodes/edges subgraph centered on a character (or entity name)."""
    return get_subgraph(novel_id, character, depth=depth)
