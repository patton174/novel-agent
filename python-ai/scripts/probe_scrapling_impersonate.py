"""Deep probe: curl_cffi impersonate + proxy vs target host."""

from __future__ import annotations

import os
import sys

PROXY = os.environ.get("CRAWL_HTTP_PROXY", "http://172.24.0.1:7890")
TARGETS = [
    "https://httpbin.org/ip",
    "https://www.qishuxia.com/",
    "https://www.shuyous.com/",
]
IMPERSONATES = ["chrome", "chrome124", "firefox", "safari"]


def test_raw_curl_cffi() -> None:
    from curl_cffi import requests as creq

    print("\n=== raw curl_cffi ===")
    for imp in IMPERSONATES:
        for url in TARGETS:
            try:
                s = creq.Session(impersonate=imp)
                r = s.get(url, proxy=PROXY, timeout=25)
                print(f"  {imp:10} {url:35} -> {r.status_code} len={len(r.text)}")
            except Exception as exc:
                print(f"  {imp:10} {url:35} -> FAIL {str(exc)[:100]}")


def test_scrapling() -> None:
    from scrapling.fetchers import Fetcher

    print("\n=== scrapling Fetcher ===")
    for imp in IMPERSONATES:
        for url in TARGETS:
            try:
                page = Fetcher.get(
                    url,
                    stealthy_headers=True,
                    impersonate=imp,
                    proxy=PROXY,
                    retries=1,
                )
                body = getattr(page, "body", b"") or b""
                print(
                    f"  {imp:10} {url:35} -> {getattr(page, 'status', '?')} len={len(body)}"
                )
            except Exception as exc:
                print(f"  {imp:10} {url:35} -> FAIL {str(exc)[:100]}")


def test_httpx() -> None:
    import httpx

    print("\n=== httpx ===")
    for url in TARGETS:
        try:
            r = httpx.get(url, proxy=PROXY, timeout=25, follow_redirects=True)
            print(f"  {url:35} -> {r.status_code} len={len(r.text)}")
        except Exception as exc:
            print(f"  {url:35} -> FAIL {str(exc)[:100]}")


def test_stealth_browser() -> None:
    print("\n=== scrapling StealthyFetcher (browser) ===")
    try:
        from scrapling.fetchers import StealthyFetcher

        for url in TARGETS[1:]:
            try:
                page = StealthyFetcher.fetch(
                    url,
                    headless=True,
                    network_idle=False,
                    timeout=45000,
                    proxy=PROXY,
                )
                body = getattr(page, "body", b"") or b""
                print(
                    f"  {url:35} -> {getattr(page, 'status', '?')} len={len(body)}"
                )
            except Exception as exc:
                print(f"  {url:35} -> FAIL {str(exc)[:120]}")
    except Exception as exc:
        print("  StealthyFetcher unavailable:", exc)


def main() -> None:
    print("proxy:", PROXY)
    test_httpx()
    test_raw_curl_cffi()
    test_scrapling()
    test_stealth_browser()
    sys.exit(0)


if __name__ == "__main__":
    main()
