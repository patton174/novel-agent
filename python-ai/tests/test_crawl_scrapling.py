"""Tests for crawl_scrapling HTTP error handling."""

from types import SimpleNamespace

from app.services.crawl_scrapling import _build_meta, page_text


class _Fake403:
    status = 403
    reason = "Forbidden"
    body = b"<!DOCTYPE html><html><body><h1>403 Forbidden</h1></body></html>"

    def css(self, _sel):
        return []

    def get_text(self):
        return ""


def test_page_text_surfaces_403():
    text = page_text(_Fake403(), 2000)
    assert "403" in text
    assert "Forbidden" in text


def test_build_meta_marks_403_blocked():
    meta = _build_meta(_Fake403(), "https://www.shuyous.com/", used_stealth=False)
    assert meta.blocked is True
    assert meta.http_status == 403
    assert "403" in meta.hint


def test_page_links_html_fallback_when_css_empty():
    from app.services.crawl_scrapling import page_links

    class _StealthLike:
        status = 200
        body = (
            b'<html><body><a href="/book/2/533.html">'
            b"\xe5\xbc\x80\xe5\xa7\x8b\xe9\x98\x85\xe8\xaf\xbb"
            b"</a></body></html>"
        )

        def css(self, _sel):
            return []

    links = page_links(_StealthLike(), "https://www.qishuxia.com/book/2/", limit=10)
    assert len(links) == 1
    assert links[0]["title"] == "\u5f00\u59cb\u9605\u8bfb"
    assert links[0]["url"] == "https://www.qishuxia.com/book/2/533.html"
