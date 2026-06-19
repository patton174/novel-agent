"""In-memory knowledge graph store (per-novel entity/relation buckets)."""

from __future__ import annotations

from typing import Any, Protocol

_EMPTY: dict[str, Any] = {"entities": {}, "relations": []}


class GraphStoreBackend(Protocol):
    def upsert_graph(
        self,
        novel_id: str,
        entities: list[dict[str, str]],
        relations: list[dict[str, str]],
    ) -> None: ...

    def get_subgraph(
        self, novel_id: str, entity: str, *, depth: int = 1
    ) -> dict[str, list[dict[str, str]]]: ...


class _MemoryGraphStore:
    def __init__(self) -> None:
        self._graphs: dict[str, dict[str, Any]] = {}

    def _bucket(self, novel_id: str) -> dict[str, Any]:
        return self._graphs.setdefault(
            novel_id,
            {"entities": {}, "relations": []},
        )

    def upsert_graph(
        self,
        novel_id: str,
        entities: list[dict[str, str]],
        relations: list[dict[str, str]],
    ) -> None:
        bucket = self._bucket(novel_id)
        for entity in entities:
            name = (entity.get("name") or "").strip()
            if not name:
                continue
            bucket["entities"][name] = {
                "name": name,
                "type": (entity.get("type") or "unknown").strip() or "unknown",
            }
        seen = {
            (r["src"], r["rel"], r["dst"])
            for r in bucket["relations"]
            if isinstance(r, dict)
        }
        for relation in relations:
            src = (relation.get("src") or "").strip()
            rel = (relation.get("rel") or "").strip()
            dst = (relation.get("dst") or "").strip()
            if not (src and rel and dst):
                continue
            key = (src, rel, dst)
            if key in seen:
                continue
            bucket["relations"].append({"src": src, "rel": rel, "dst": dst})
            seen.add(key)

    def get_subgraph(
        self, novel_id: str, entity: str, *, depth: int = 1
    ) -> dict[str, list[dict[str, str]]]:
        root = (entity or "").strip()
        if not root:
            return {"nodes": [], "edges": []}

        bucket = self._graphs.get(novel_id, _EMPTY)
        entities: dict[str, dict[str, str]] = bucket.get("entities") or {}
        relations: list[dict[str, str]] = bucket.get("relations") or []

        frontier = {root}
        visited = set(frontier)
        linked: list[dict[str, str]] = []

        for _ in range(max(1, depth)):
            next_frontier: set[str] = set()
            for rel in relations:
                src = rel.get("src", "")
                dst = rel.get("dst", "")
                if src in frontier or dst in frontier:
                    linked.append(rel)
                    for name in (src, dst):
                        if name and name not in visited:
                            next_frontier.add(name)
                            visited.add(name)
            frontier = next_frontier
            if not frontier:
                break

        nodes: list[dict[str, str]] = []
        for name in sorted(visited):
            meta = entities.get(name)
            if meta:
                nodes.append(
                    {"id": name, "name": meta["name"], "type": meta.get("type", "unknown")}
                )
            else:
                nodes.append({"id": name, "name": name, "type": "unknown"})

        edges = [
            {"source": r["src"], "target": r["dst"], "rel": r["rel"]}
            for r in linked
        ]
        return {"nodes": nodes, "edges": edges}

    def clear_novel(self, novel_id: str) -> None:
        self._graphs.pop(novel_id, None)

    def get_novel_graph(self, novel_id: str) -> dict[str, list[dict[str, str]]]:
        bucket = self._graphs.get(novel_id, _EMPTY)
        entities: dict[str, dict[str, str]] = bucket.get("entities") or {}
        relations: list[dict[str, str]] = bucket.get("relations") or []
        nodes = [
            {"id": name, "name": meta["name"], "type": meta.get("type", "unknown")}
            for name, meta in sorted(entities.items())
        ]
        edges = [
            {"source": r["src"], "target": r["dst"], "rel": r["rel"]}
            for r in relations
            if isinstance(r, dict)
        ]
        return {"nodes": nodes, "edges": edges}


_default_store = _MemoryGraphStore()
_test_store: GraphStoreBackend | None = None


def _backend() -> GraphStoreBackend:
    if _test_store is not None:
        return _test_store
    return _default_store


def set_test_store(backend: GraphStoreBackend | None) -> None:
    global _test_store
    _test_store = backend


def upsert_graph(
    novel_id: str,
    entities: list[dict[str, str]],
    relations: list[dict[str, str]],
) -> None:
    _backend().upsert_graph(novel_id, entities, relations)


def get_subgraph(
    novel_id: str, entity: str, *, depth: int = 1
) -> dict[str, list[dict[str, str]]]:
    return _backend().get_subgraph(novel_id, entity, depth=depth)


def get_novel_graph(novel_id: str) -> dict[str, list[dict[str, str]]]:
    store = _backend()
    if hasattr(store, "get_novel_graph"):
        return store.get_novel_graph(novel_id)  # type: ignore[attr-defined]
    return {"nodes": [], "edges": []}


def clear_novel_graph(novel_id: str) -> None:
    store = _backend()
    if hasattr(store, "clear_novel"):
        store.clear_novel(novel_id)  # type: ignore[attr-defined]
