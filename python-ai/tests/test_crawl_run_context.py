"""RUN_CONTEXT marker injection tests."""

from langchain_core.messages import HumanMessage, SystemMessage

from app.crawl.agent.context import CrawlAgentContext
from app.crawl.agent.prompting.run_context import RUN_CONTEXT_MARKER, refresh_crawl_run_context
from unittest.mock import MagicMock


def _ctx() -> CrawlAgentContext:
    return CrawlAgentContext(
        job_id="preview",
        entry_url="https://example.com",
        goal="test",
        client=MagicMock(),
    )


def test_refresh_replaces_marked_message_not_index_one():
    ctx = _ctx()
    messages = [
        SystemMessage(content="sys"),
        HumanMessage(content="task"),
        HumanMessage(content=f"{RUN_CONTEXT_MARKER}\nold"),
    ]
    refresh_crawl_run_context(messages, ctx)
    assert messages[1].content == "task"
    assert isinstance(messages[2], HumanMessage)
    assert messages[2].content.startswith(RUN_CONTEXT_MARKER)
    assert "入口 URL" in messages[2].content


def test_refresh_inserts_after_system_when_missing():
    ctx = _ctx()
    messages = [SystemMessage(content="sys"), HumanMessage(content="task")]
    refresh_crawl_run_context(messages, ctx)
    assert len(messages) == 3
    assert messages[1].content.startswith(RUN_CONTEXT_MARKER)
