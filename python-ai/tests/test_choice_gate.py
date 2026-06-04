from app.agents.choice_gate import clear_pending, parse_choice_pick, set_pending
from app.agents.novel_graph import route_user_turn


def test_route_blocks_when_pending_choices_not_selected():
    sid = "session_gate_1"
    clear_pending(sid)
    set_pending(
        sid,
        [
            {"id": "opt-1", "title": "雨夜重逢", "description": "情感向"},
            {"id": "opt-2", "title": "古堡谜案", "description": "悬疑向"},
        ],
    )
    routed = route_user_turn(session_id=sid, user_message="继续写")
    assert routed.route == "blocked_hint"
    clear_pending(sid)


def test_route_allows_write_after_user_pick():
    sid = "session_gate_2"
    clear_pending(sid)
    choices = [{"id": "opt-1", "title": "雨夜重逢", "description": "情感向"}]
    set_pending(sid, choices)
    picked = parse_choice_pick("我选择「雨夜重逢」", choices)
    assert picked is not None
    routed = route_user_turn(session_id=sid, user_message="我选择「雨夜重逢」")
    assert routed.route == "stream_write"
    assert routed.chosen and routed.chosen.get("title") == "雨夜重逢"
    clear_pending(sid)
