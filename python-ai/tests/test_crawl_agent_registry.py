"""Crawl agent tool registry smoke tests."""

from app.crawl_agent.tools import impl  # noqa: F401 — register
from app.crawl_agent.tools.registry import find_tool, get_all_tools


def test_crawl_tools_registered():
    names = {t.name for t in get_all_tools()}
    expected = {
        "FetchPage",
        "DiscoverChapters",
        "InitNovel",
        "FetchAndSaveChapter",
        "SaveQueuedChapters",
        "GetJobStatus",
        "CompleteJob",
        "FailJob",
    }
    assert expected <= names


def test_fetch_page_schema():
    tool = find_tool("FetchPage")
    assert tool is not None
    parsed, err = tool.parse_input({"url": "https://example.com/book/1"})
    assert err is None
    assert parsed is not None
    assert parsed.url.startswith("https://")
