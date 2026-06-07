"""Integration: crawl tool loop with mocked FetchEngine path and Content client."""

from __future__ import annotations

from collections import deque
from unittest.mock import AsyncMock, MagicMock, PropertyMock, patch

import pytest
from langchain_core.messages import AIMessage

from app.core.llm import LLMProvider
from app.crawl.agent.context import CrawlAgentContext
from app.crawl.agent.loop import run_crawl_tool_loop
from app.crawl.extract.ai_extractor import ChapterExtraction


def _mock_client() -> AsyncMock:
    client = AsyncMock()
    client.append_log = AsyncMock()
    client.get_job = AsyncMock(
        return_value={"status": "RUNNING", "catalogNovelId": "cat-99"}
    )
    client.init_catalog = AsyncMock()
    client.import_chapter = AsyncMock(return_value={"catalogNovelId": "cat-99"})
    client.update_progress = AsyncMock()
    client.complete_job = AsyncMock()
    client.fail_job = AsyncMock()
    client.save_runtime_state = AsyncMock()
    return client


def _llm_turns() -> deque[AIMessage]:
    return deque(
        [
            AIMessage(
                content="",
                tool_calls=[
                    {
                        "id": "call_q",
                        "name": "QueueChapters",
                        "args": {
                            "novel_title": "测试小说",
                            "author": "作者甲",
                            "chapters": [
                                {"title": "第1章", "url": "https://ex.com/c/1", "sort_order": 1},
                                {"title": "第2章", "url": "https://ex.com/c/2", "sort_order": 2},
                            ],
                        },
                    }
                ],
            ),
            AIMessage(
                content="",
                tool_calls=[
                    {
                        "id": "call_i",
                        "name": "InitNovel",
                        "args": {
                            "title": "测试小说",
                            "author": "作者甲",
                            "description": "",
                            "source_url": "https://ex.com/book/1",
                        },
                    }
                ],
            ),
            AIMessage(
                content="",
                tool_calls=[
                    {"id": "call_s", "name": "SaveQueuedChapters", "args": {"start_from": 1}},
                ],
            ),
            AIMessage(
                content="",
                tool_calls=[
                    {"id": "call_c", "name": "CompleteJob", "args": {"message": "全部入库"}},
                ],
            ),
        ]
    )


@pytest.mark.asyncio
async def test_crawl_loop_queue_init_save_complete():
    client = _mock_client()
    ctx = CrawlAgentContext(
        job_id="job-int-1",
        entry_url="https://ex.com/book/1",
        goal="抓取《测试小说》全部章节入库",
        client=client,
        site_config={"content_selector": "#content"},
    )
    turns = _llm_turns()
    page = MagicMock()
    meta = MagicMock(http_status=200, blocked=False, hint="")

    async def _next_ai(_llm, _messages, _ctx):
        return turns.popleft()

    with (
        patch.object(
            LLMProvider,
            "is_crawl_configured",
            new_callable=PropertyMock,
            return_value=True,
        ),
        patch("app.crawl.agent.loop.llm_provider.get_llm") as get_llm,
        patch(
            "app.crawl.agent.loop.invoke_llm_with_pairing_retry",
            side_effect=_next_ai,
        ),
        patch(
            "app.crawl.agent.tools.impl.fetch_for_crawl_async",
            new_callable=AsyncMock,
            return_value=(page, meta),
        ),
        patch(
            "app.crawl.agent.tools.impl.extract_chapter",
            new_callable=AsyncMock,
            return_value=ChapterExtraction(title="章节正文", content="x" * 120),
        ),
        patch("app.crawl.agent.tools.impl.persist_runtime", new_callable=AsyncMock),
        patch("app.crawl.agent.loop.close_browser_session", new_callable=AsyncMock),
    ):
        mock_llm = MagicMock()
        mock_llm.bind_tools.return_value = mock_llm
        get_llm.return_value = mock_llm

        result = await run_crawl_tool_loop(ctx, max_turns=8)

    assert result.ok is True
    assert result.chapter_count == 2
    assert ctx.catalog_novel_id == "cat-99"
    client.init_catalog.assert_awaited_once()
    assert client.import_chapter.await_count == 2
    client.complete_job.assert_awaited_once_with(
        "job-int-1",
        catalog_novel_id="cat-99",
        title="测试小说",
    )
