"""Probe zdopen free proxy API and test against novel sites."""

from __future__ import annotations

import sys
import time

import httpx

API = "http://www.zdopen.com/FreeProxy/Get/"
PARAMS = {
    "app_id": "202606071252485720",
    "akey": "634034f8a220f9c6",
    "dalu": 1,
    "return_type": 3,
    "count": 10,
}
TARGETS = [
    "https://www.qishuxia.com/",
    "https://www.shuyous.com/",
    "http://httpbin.org/ip",
]


def fetch_pool(extra: dict | None = None) -> list[dict]:
    params = {**PARAMS, **(extra or {})}
    r = httpx.get(API, params=params, timeout=15)
    data = r.json()
    print("API code:", data.get("code"), data.get("msg", "")[:120])
    if data.get("code") != "10001":
        return []
    return data.get("data", {}).get("proxy_list") or []


def proxy_url(item: dict) -> str:
    proto = item.get("protocol") or "http"
    return f"{proto}://{item['ip']}:{item['port']}"


def main() -> None:
    print("=== strict (user URL filters) ===")
    strict = {
        "protocol_type": 4,
        "level_type": 1,
        "lastcheck_type": 2,
        "sleep_type": 1,
        "alive_type": 6,
    }
    fetch_pool(strict)
    time.sleep(2)

    print("\n=== relaxed (any protocol) ===")
    pool = fetch_pool()
    if not pool:
        sys.exit(1)

    print(f"\n=== test {len(pool)} proxies ===")
    ok = 0
    for item in pool:
        url = proxy_url(item)
        for target in TARGETS:
            try:
                resp = httpx.get(
                    target,
                    proxy=url,
                    timeout=10,
                    follow_redirects=True,
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
                )
                print(f"OK  {url:30} -> {target} status={resp.status_code} len={len(resp.text)}")
                if resp.status_code == 200:
                    ok += 1
            except Exception as exc:
                print(f"FAIL {url:30} -> {target} {type(exc).__name__}: {str(exc)[:80]}")
        time.sleep(0.3)
    print(f"\nusable 200 responses: {ok}")


if __name__ == "__main__":
    main()
