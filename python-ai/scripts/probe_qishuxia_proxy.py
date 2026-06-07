"""Quick qishuxia probe — multiple proxy URLs and hosts."""

from __future__ import annotations

import os
import sys

PROXIES = [
    os.environ.get("CRAWL_HTTP_PROXY", ""),
    "http://127.0.0.1:7890",
    "http://172.24.0.1:7890",
    "socks5://127.0.0.1:7890",
    "socks5://172.24.0.1:7890",
]
URLS = [
    "https://www.qishuxia.com/",
    "https://qishuxia.com/",
    "http://www.qishuxia.com/",
]


def try_fetch(label: str, url: str, proxy: str | None) -> None:
    from scrapling.fetchers import Fetcher

    kwargs = {"stealthy_headers": True, "impersonate": "chrome124", "retries": 1, "timeout": 30}
    if proxy:
        kwargs["proxy"] = proxy
    try:
        page = Fetcher.get(url, **kwargs)
        body = getattr(page, "body", b"") or b""
        print(f"OK  {label:28} {url:32} status={getattr(page,'status','?')} len={len(body)}")
    except Exception as exc:
        print(f"FAIL {label:28} {url:32} {str(exc)[:90]}")


def main() -> None:
    seen = set()
    for px in PROXIES:
        px = (px or "").strip()
        if not px or px in seen:
            continue
        seen.add(px)
        print(f"\n=== proxy {px} ===")
        for url in URLS:
            try_fetch(px, url, px)
    print("\n=== direct (no proxy) ===")
    for url in URLS:
        try_fetch("direct", url, None)
    sys.exit(0)


if __name__ == "__main__":
    main()
