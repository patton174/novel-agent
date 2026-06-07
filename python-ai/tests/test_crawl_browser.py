"""Tests for Playwright browser session helpers."""

from app.crawl.fetch.browser import prepare_html_for_ai, playwright_proxy


def test_prepare_html_for_ai_strips_script():
    raw = '<html><script>x()</script><a href="/x">链</a></html>'
    out = prepare_html_for_ai(raw)
    assert "x()" not in out
    assert 'href="/x"' in out


def test_playwright_proxy_parses_auth():
    cfg = playwright_proxy("http://user:pass@gate.example:8080")
    assert cfg is not None
    assert cfg["server"] == "http://gate.example:8080"
    assert cfg["username"] == "user"
    assert cfg["password"] == "pass"
