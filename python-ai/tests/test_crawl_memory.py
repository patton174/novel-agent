"""Crawl context memory append/prune tests."""

from app.crawl_agent.context import CrawlAgentContext
from app.crawl_agent.memory import CrawlContextMemory
from app.crawl_agent.prompting.run_context import build_crawl_run_context
from app.services.crawl_content_client import CrawlContentClient


def _ctx() -> CrawlAgentContext:
    return CrawlAgentContext(
        job_id="preview",
        entry_url="https://www.shuyous.com/",
        goal="爬取热度第一的书籍",
        client=CrawlContentClient(),
    )


def test_append_page_injects_content_into_run_context():
    ctx = _ctx()
    ctx.memory.apply_patch(
        {
            "append_page": {
                "url": "https://www.shuyous.com/",
                "content": "强力推荐\n《测试书名》",
                "links_index": [{"title": "排行", "url": "https://www.shuyous.com/ph.html"}],
            }
        }
    )
    block = build_crawl_run_context(ctx)
    assert "强力推荐" in block
    assert "《测试书名》" in block
    assert "ph.html" in block


def test_catalog_invalidates_old_pages():
    mem = CrawlContextMemory()
    mem.apply_patch(
        {
            "append_page": {
                "url": "https://www.shuyous.com/",
                "content": "首页正文",
                "links_index": [],
            }
        }
    )
    mem.apply_patch(
        {
            "append_catalog": {
                "url": "https://www.shuyous.com/book/1.html",
                "title": "测试书",
                "author": "作者",
                "chapter_count": 3,
                "chapters_preview": [{"title": "第1章", "url": "https://x/1"}],
            }
        }
    )
    active = mem.active_entries()
    assert any(e.kind == "catalog" for e in active)
    assert not any(e.kind == "page_view" and e.active for e in active)


def test_max_two_active_page_views():
    mem = CrawlContextMemory()
    for i in range(3):
        mem.apply_patch(
            {
                "append_page": {
                    "url": f"https://example.com/p{i}",
                    "content": f"page {i}",
                    "links_index": [],
                }
            }
        )
    active_pages = [e for e in mem.active_entries() if e.kind == "page_view"]
    assert len(active_pages) == 2
    assert active_pages[-1].url == "https://example.com/p2"
