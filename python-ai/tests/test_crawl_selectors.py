"""Selector / MapLinks helper tests."""

from app.crawl.engine.selectors import extract_links_from_items, guess_sort_orders


def test_extract_links_classifies_chapter():
    items = [
        {"title": "第一章 开端", "url": "https://ex.com/book/1/1.html"},
        {"title": "目录", "url": "https://ex.com/book/1/index.html"},
    ]
    links = extract_links_from_items(items, "https://ex.com/book/1.html")
    kinds = {ln.url: ln.kind for ln in links}
    assert kinds["https://ex.com/book/1/1.html"] == "chapter"
    assert kinds["https://ex.com/book/1/index.html"] == "catalog"


def test_guess_sort_orders_from_titles():
    from app.crawl.engine.types import LinkItem

    links = [
        LinkItem(text="第一章 开端", url="https://ex.com/1.html", kind="chapter"),
        LinkItem(text="第二章 相遇", url="https://ex.com/2.html", kind="chapter"),
    ]
    preview = guess_sort_orders(links)
    assert preview[0]["sort_order"] == 1
    assert preview[1]["sort_order"] == 2
