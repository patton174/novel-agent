"""Crawl agent tool registry smoke tests."""

from app.crawl.agent.tools import catalog_impl  # noqa: F401
from app.crawl.agent.tools import impl  # noqa: F401 — register
from app.crawl.agent.tools.registry import find_tool, get_all_tools


def test_crawl_tools_registered():
    names = {t.name for t in get_all_tools()}
    expected = {
        "FetchPage",
        "MapLinks",
        "BrowserOpen",
        "BrowserClick",
        "BrowserGoto",
        "BrowserSnapshot",
        "ListCatalogNovels",
        "GetCatalogNovel",
        "GetCatalogProgress",
        "UpdateCatalogNovel",
        "DeleteCatalogNovel",
        "ListCatalogChapters",
        "GetCatalogChapter",
        "AddCatalogChapter",
        "UpdateCatalogChapter",
        "DeleteCatalogChapter",
        "UpdateCoverUrl",
        "QueueChapters",
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


def test_catalog_tools_have_schemas():
    for name in ("ListCatalogChapters", "UpdateCatalogChapter", "GetCatalogNovel"):
        tool = find_tool(name)
        assert tool is not None
        parsed, err = tool.parse_input({} if name != "UpdateCatalogChapter" else {"chapter_id": "x"})
        if name == "UpdateCatalogChapter":
            assert err is None
        assert tool.description
