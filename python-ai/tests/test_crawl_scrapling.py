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
