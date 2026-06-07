"""Tests for transport failure handling without raising to callers."""

from app.services.crawl_scrapling import (
    _is_tls_or_proxy_error,
    _should_retry_next_mihomo_node,
    _transport_failure_result,
    fetch_page_with_retry,
    PageFetchMeta,
)


def test_should_retry_next_mihomo_node_tls_only():
    assert _should_retry_next_mihomo_node(
        None,
        RuntimeError("curl: (35) TLS connect error"),
    )
    meta = PageFetchMeta(
        http_status=403,
        used_stealth=False,
        content_chars=200,
        link_count=0,
        blocked=True,
        hint="403",
    )
    assert not _should_retry_next_mihomo_node(meta, None)


def test_transport_failure_result_no_raise(monkeypatch):
    monkeypatch.setattr(
        "app.services.crawl_scrapling.mihomo_rotation_enabled",
        lambda: False,
    )
    monkeypatch.setattr(
        "app.services.crawl_scrapling.proxy_candidates_for_fetch",
        lambda _p: ["http://127.0.0.1:7890", None],
    )

    def boom(*_a, **_k):
        raise RuntimeError("curl: (35) TLS connect error: OPENSSL_internal")

    monkeypatch.setattr("app.services.crawl_scrapling.fetch_page", boom)
    monkeypatch.setattr("app.services.crawl_scrapling.settings.crawl_browser_fetch_enabled", False)

    page, meta = fetch_page_with_retry("https://example.com/", proxy="http://127.0.0.1:7890")
    assert meta.http_status == 0
    assert meta.blocked is True
    assert "TLS" not in meta.hint
    assert page is not None


def test_transport_failure_meta_hint():
    _page, meta = _transport_failure_result("https://x.test/", proxy_node_retries=3)
    assert meta.proxy_node_retries == 3
    assert "BrowserOpen" in meta.hint


def test_is_tls_or_proxy_error_connect_reset():
    assert _is_tls_or_proxy_error(RuntimeError("curl: (56) connection reset by peer"))
