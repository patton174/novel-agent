"""KG store — upsert and subgraph retrieval."""

from __future__ import annotations

from app.kg.store import _MemoryGraphStore, get_subgraph, set_test_store, upsert_graph


def setup_function():
    set_test_store(_MemoryGraphStore())


def teardown_function():
    set_test_store(None)


def test_upsert_and_subgraph_contains_relation():
    upsert_graph(
        "n1",
        [{"name": "林动", "type": "character"}, {"name": "师傅", "type": "character"}],
        [{"src": "林动", "rel": "师承", "dst": "师傅"}],
    )
    graph = get_subgraph("n1", "林动")
    rels = {e["rel"] for e in graph["edges"]}
    names = {n["name"] for n in graph["nodes"]}
    assert "师承" in rels
    assert {"林动", "师傅"} <= names
