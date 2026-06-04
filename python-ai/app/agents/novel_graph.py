"""LangGraph: route a user turn when a choose gate is active."""

from __future__ import annotations

from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.agents.choice_gate import (
    HINT_NEED_INTERACTION,
    RouteTurn,
    consume_pending,
    parse_interaction_submission,
    peek_pending,
)


class _RouterState(TypedDict, total=False):
    session_id: str
    last_user_text: str
    route: str
    blocked_message: str
    interaction_submission: dict


def _route_node(state: _RouterState) -> _RouterState:
    sid = (state.get("session_id") or "").strip()
    text = (state.get("last_user_text") or "").strip()
    pend = peek_pending(sid)
    if not pend:
        return {**state, "route": "orchestrator"}
    submission = parse_interaction_submission(text, pend)
    if submission:
        consume_pending(sid)
        return {
            **state,
            "route": "submit_interaction",
            "interaction_submission": submission,
        }
    # 用户明确表示“这批方向不合适/想换一批”时，不应强制卡片点选，放行回编排器重新生成方向。
    refresh_intent = any(
        token in text
        for token in ("换一批", "重新生成", "不是这", "不想要这", "不要这", "不合适", "太死板")
    )
    if refresh_intent:
        consume_pending(sid)
        return {**state, "route": "orchestrator"}
    return {
        **state,
        "route": "blocked_hint",
        "blocked_message": HINT_NEED_INTERACTION,
    }


def build_route_graph():
    g = StateGraph(_RouterState)
    g.add_node("router", _route_node)
    g.add_edge(START, "router")
    g.add_edge("router", END)
    return g.compile()


_route_app = build_route_graph()


def route_user_turn(*, session_id: str, user_message: str) -> RouteTurn:
    out = _route_app.invoke(
        {"session_id": session_id, "last_user_text": user_message},
        config={"configurable": {"thread_id": session_id}},
    )
    route = out.get("route") or "orchestrator"
    if route == "blocked_hint":
        return RouteTurn(route="blocked_hint")
    if route == "submit_interaction":
        submission = out.get("interaction_submission") or {}
        return RouteTurn(
            route="submit_interaction",
            chosen=submission,
        )
    return RouteTurn(route="orchestrator")
