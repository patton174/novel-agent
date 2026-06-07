"""Tests for crawl_scrapling HTTP error handling."""

from types import SimpleNamespace

from app.crawl.fetch.scrapling import _build_meta, page_text


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
    assert "代理" not in meta.hint


def test_page_links_html_fallback_when_css_empty():
    from app.crawl.fetch.scrapling import page_links

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


def test_page_html_strips_script_keeps_links():
    from app.crawl.fetch.scrapling import page_html

    class _Page:
        status = 200
        body = (
            b"<html><head><script>bad()</script></head><body>"
            b'<a href="/wangyouxiaoshuo/">'
            b"\xe7\xbd\x91\xe6\xb8\xb8\xe7\xab\x9e\xe6\x8a\x80"
            b"</a></body></html>"
        )

        def css(self, _sel):
            return []

    html = page_html(_Page(), 5000)
    assert "网游竞技" in html
    assert "/wangyouxiaoshuo/" in html
    assert "bad()" not in html
    assert "<script" not in html.lower()


def test_is_scrapling_tls_error():
    from app.crawl.fetch.scrapling import _is_scrapling_tls_error

    assert _is_scrapling_tls_error(RuntimeError("curl: (35) TLS connect error: OPENSSL_internal"))
    assert not _is_scrapling_tls_error(RuntimeError("HTTP 404"))


def test_proxy_candidates_for_fetch():
    from app.crawl.fetch.proxy import proxy_candidates_for_fetch

    chain = proxy_candidates_for_fetch("http://127.0.0.1:7890")
    assert chain[0] == "http://127.0.0.1:7890"
    assert None in chain


def test_page_links_scrapling_selector_get_no_default():
    from app.crawl.fetch.scrapling import page_links

    class _Anchor:
        attrib = {"href": "/wangyouxiaoshuo/"}

        @property
        def text(self):
            return ""

        def get(self, key):
            if key == "text":
                return "网游竞技"
            return None

    class _Page:
        status = 200

        def css(self, _sel):
            return [_Anchor()]

    links = page_links(_Page(), "https://www.qishuxia.com/", limit=5)
    assert len(links) == 1
    assert links[0]["title"] == "网游竞技"
    assert links[0]["url"] == "https://www.qishuxia.com/wangyouxiaoshuo/"
