"""Tests for crawl_proxy resolution and masking."""

from app.crawl.fetch.proxy import _split_proxy_list, mask_proxy_url, pick_crawl_proxy


def test_split_proxy_list():
    assert _split_proxy_list("http://a:1, http://b:2") == ["http://a:1", "http://b:2"]
    assert _split_proxy_list("http://a:1\nhttp://b:2") == ["http://a:1", "http://b:2"]


def test_pick_crawl_proxy_task_override():
    cfg = {"httpProxy": "http://user:pass@proxy.example:8080"}
    assert pick_crawl_proxy(cfg) == "http://user:pass@proxy.example:8080"


def test_pick_crawl_proxy_use_env_disabled():
    cfg = {"use_proxy": False}
    assert pick_crawl_proxy(cfg) is None


def test_pick_crawl_proxy_explicit_override_wins():
    cfg = {"use_proxy": False, "httpProxy": "http://task-only:1"}
    assert pick_crawl_proxy(cfg) == "http://task-only:1"


def test_mask_proxy_url_hides_credentials():
    assert mask_proxy_url("http://user:secret@gate.example:12345") == "gate.example:12345"
    assert mask_proxy_url(None) == ""
