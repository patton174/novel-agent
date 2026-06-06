"""Tests for crawl AI heuristics (no LLM)."""

from app.services.crawl_ai_extractor import _heuristic_catalog_urls, _same_book_url


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
