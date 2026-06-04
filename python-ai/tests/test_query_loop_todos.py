from app.agent_step.query_loop_support import (
    build_todo_exit_review_message,
    open_todo_items,
)


def test_open_todo_items_filters_completed():
    patch = {
        "todos": [
            {"id": "a", "content": "done", "status": "completed"},
            {"id": "b", "content": "wip", "status": "in_progress"},
        ]
    }
    assert len(open_todo_items(patch)) == 1
    assert open_todo_items(patch)[0]["id"] == "b"


def test_build_todo_exit_review_message():
    msg = build_todo_exit_review_message(
        {"todos": [{"id": "x", "content": "验证衔接", "status": "pending"}]}
    )
    assert msg is not None
    assert "TodoWrite" in msg
    assert "验证衔接" in msg
    assert "尚未完成" in msg
    assert "继续调用" in msg
    assert "虚假" in msg or "不要仅为结束" in msg
