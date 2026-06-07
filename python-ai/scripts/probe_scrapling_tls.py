"""Probe Scrapling Fetcher TLS/proxy behavior (run inside python-ai container)."""

from __future__ import annotations

import os
import sys

PROXY = os.environ.get("CRAWL_HTTP_PROXY", "http://172.24.0.1:7890")
TARGETS = [
    "https://httpbin.org/ip",
    "https://www.qishuxia.com/",
]


def main() -> None:
    print("proxy:", PROXY or "(none)")
    try:
        import curl_cffi

        print("curl_cffi:", curl_cffi.__version__)
    except Exception as exc:
        print("curl_cffi import fail:", exc)

    import ssl

    print("ssl:", ssl.OPENSSL_VERSION)

    from scrapling.fetchers import Fetcher

    for url in TARGETS:
        print(f"\n=== {url} ===")
        for label, kwargs in [
            ("no-proxy", {}),
            ("proxy", {"proxy": PROXY} if PROXY else {}),
        ]:
            if not kwargs and label == "proxy":
                continue
            try:
                page = Fetcher.get(url, stealthy_headers=True, **kwargs)
                status = getattr(page, "status", "?")
                body = getattr(page, "body", b"") or b""
                print(f"  {label}: OK status={status} len={len(body)}")
            except Exception as exc:
                print(f"  {label}: FAIL {type(exc).__name__}: {exc}")

    # raw curl_cffi session with proxy
    print("\n=== raw curl_cffi Session ===")
    try:
        from curl_cffi import requests as creq

        s = creq.Session(impersonate="chrome")
        r = s.get(TARGETS[0], proxy=PROXY, timeout=20)
        print("raw proxy ok", r.status_code, len(r.text))
    except Exception as exc:
        print("raw proxy FAIL", exc)

    sys.exit(0)


if __name__ == "__main__":
    main()
