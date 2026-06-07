"""Tests for mihomo node rotation helpers."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.services import crawl_mihomo


@pytest.fixture(autouse=True)
def _reset_mihomo_cache():
    crawl_mihomo.clear_node_cache()
    crawl_mihomo._failed_until.clear()
    yield
    crawl_mihomo.clear_node_cache()
    crawl_mihomo._failed_until.clear()


def test_is_eligible_leaf_skips_groups():
    proxies = {
        "DIRECT": {"type": "Direct"},
        "♻️ 自动选择": {"type": "URLTest", "all": []},
        "新加坡BGP": {"type": "Trojan"},
        "⚠️ bad": {"type": "Shadowsocks"},
    }
    assert not crawl_mihomo._is_eligible_leaf("DIRECT", proxies)
    assert not crawl_mihomo._is_eligible_leaf("♻️ 自动选择", proxies)
    assert not crawl_mihomo._is_eligible_leaf("⚠️ bad", proxies)
    assert crawl_mihomo._is_eligible_leaf("新加坡BGP", proxies)


def test_list_rotatable_nodes_from_bulk_api(monkeypatch):
    monkeypatch.setattr(
        crawl_mihomo.settings,
        "crawl_mihomo_proxy_group",
        "🚀 节点选择",
    )

    def fake_request(method, path, *, json_body=None):
        assert method == "GET"
        assert path == "/proxies"
        return {
            "proxies": {
                "🚀 节点选择": {
                    "type": "Selector",
                    "now": "日本NTT",
                    "all": ["DIRECT", "♻️ 自动选择", "日本NTT", "新加坡BGP"],
                },
                "♻️ 自动选择": {"type": "URLTest", "all": []},
                "日本NTT": {"type": "Trojan"},
                "新加坡BGP": {"type": "Trojan"},
            }
        }

    monkeypatch.setattr(crawl_mihomo, "_request", fake_request)
    nodes = crawl_mihomo.list_rotatable_nodes(force_refresh=True)
    assert nodes == ["日本NTT", "新加坡BGP"]


def test_iter_nodes_for_retry_current_first(monkeypatch):
    monkeypatch.setattr(
        crawl_mihomo,
        "list_rotatable_nodes",
        lambda **_: ["日本NTT", "新加坡BGP", "香港BGP"],
    )
    monkeypatch.setattr(crawl_mihomo, "current_node", lambda: "新加坡BGP")
    ordered = crawl_mihomo.iter_nodes_for_retry()
    assert ordered[0] == "新加坡BGP"
    assert set(ordered) == {"日本NTT", "新加坡BGP", "香港BGP"}


def test_record_node_failure_skips_during_cooldown(monkeypatch):
    monkeypatch.setattr(crawl_mihomo.settings, "crawl_mihomo_fail_cooldown_sec", 600)
    monkeypatch.setattr(
        crawl_mihomo,
        "list_rotatable_nodes",
        lambda **_: ["日本NTT", "新加坡BGP"],
    )
    monkeypatch.setattr(crawl_mihomo, "current_node", lambda: "日本NTT")
    crawl_mihomo.record_node_failure("日本NTT")
    ordered = crawl_mihomo.iter_nodes_for_retry()
    assert ordered == ["新加坡BGP"]


def test_fetch_with_mihomo_rotates_on_tls_error(monkeypatch):
    from app.config import settings as app_settings
    from app.services.crawl_scrapling import _fetch_with_mihomo_node_rotation

    monkeypatch.setattr(app_settings, "crawl_http_proxy", "http://127.0.0.1:7890")
    monkeypatch.setattr(app_settings, "crawl_mihomo_max_nodes", 12)
    monkeypatch.setattr(
        "app.services.crawl_scrapling.mihomo_rotation_enabled",
        lambda: True,
    )
    monkeypatch.setattr(
        "app.services.crawl_scrapling.iter_nodes_for_retry",
        lambda: ["节点A", "节点B"],
    )

    selected: list[str] = []

    def fake_select(node: str) -> None:
        selected.append(node)

    monkeypatch.setattr(
        "app.services.crawl_scrapling.select_node",
        fake_select,
    )

    class _OkPage:
        status = 200
        body = (
            b"<html><body>"
            b"ok content here with enough text for page validation and crawl test "
            b"padding padding padding padding padding"
            b"</body></html>"
        )

        def css(self, _sel):
            return []

    def fake_fetch(url, *, stealth=False, proxy=None):
        if selected and selected[-1] == "节点A":
            raise RuntimeError("curl: (35) TLS connect error: OPENSSL_internal")
        return _OkPage()

    monkeypatch.setattr(
        "app.services.crawl_scrapling.fetch_page",
        fake_fetch,
    )
    monkeypatch.setattr(
        "app.services.crawl_scrapling.record_node_failure",
        MagicMock(),
    )
    monkeypatch.setattr(
        "app.services.crawl_scrapling.record_node_success",
        MagicMock(),
    )

    page, meta = _fetch_with_mihomo_node_rotation(
        "https://www.qishuxia.com/",
        auto_stealth=False,
        proxy=None,
    )
    assert selected == ["节点A", "节点B"]
    assert page.status == 200
    assert meta.blocked is False
