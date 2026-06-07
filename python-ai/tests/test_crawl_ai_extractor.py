"""Tests for crawl AI heuristics (no LLM)."""

from app.crawl.engine.content_extract import extract_chapter_via_selector
from app.crawl.extract.ai_extractor import _heuristic_catalog_urls, _same_book_url
from app.crawl.fetch.fetch import HtmlBodyPage


def test_same_book_url_shuyous():
    base = "https://www.shuyous.com/book/4057577.html"
    catalog = "https://www.shuyous.com/book/4057577/index.html"
    other = "https://www.shuyous.com/book/9999999.html"
    assert _same_book_url(base, catalog)
    assert not _same_book_url(base, other)


def test_heuristic_catalog_urls_prefers_directory_link():
    page_url = "https://www.shuyous.com/book/4057577.html"
    links = [
        {"title": "首页", "url": "https://www.shuyous.com/"},
        {"title": "真苟啊 目录 (共176章)", "url": "https://www.shuyous.com/book/4057577/index.html"},
        {"title": "加入书架", "url": "https://www.shuyous.com/user/shelf"},
    ]
    urls = _heuristic_catalog_urls(links, page_url)
    assert urls
    assert "index.html" in urls[0]


def test_custom_content_selector_from_site_config():
    html = '<div class="custom-body">' + ("字" * 80) + "</div>"
    page = HtmlBodyPage(body=html)
    hit = extract_chapter_via_selector(
        page,
        site_config={"content_selector": ".custom-body"},
        min_chars=50,
    )
    assert hit is not None
    assert len(hit[1]) >= 50
