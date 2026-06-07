from app.agent.harness.intent_message import (
    intent_user_message_for_context,
    split_embedded_qa_from_user_message,
)


def test_split_embedded_qa_from_trailing_paragraphs():
    raw = (
        "请按顺序做一次全链路自检。\n"
        "4. AskUser 问我续写偏好，等我回复\n\n"
        "《开局无限掉宝》目前写到第86章，请问您希望如何续写？：都可以\n"
        "您更倾向于哪种写作风格？：都可以"
    )
    task, lines = split_embedded_qa_from_user_message(raw)
    assert "全链路自检" in task
    assert "都可以" not in task
    assert len(lines) == 2
    assert "续写" in lines[0]


def test_intent_user_message_strips_embedded_qa_without_interaction():
    raw = "继续写\n\n第一题？：A"
    assert intent_user_message_for_context(raw, has_run_interaction=False) == "继续写"


def test_intent_user_message_keeps_embedded_qa_after_real_interaction():
    raw = "继续写\n\n第一题？：A"
    assert intent_user_message_for_context(raw, has_run_interaction=True) == raw
