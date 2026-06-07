"""Stealth browser + HTTP fetch via mihomo HTTP proxy."""

from scrapling.fetchers import Fetcher, StealthyFetcher

PROXY = "http://172.24.0.1:7890"
URL = "https://www.qishuxia.com/"

print("=== HTTP Fetcher chrome124 ===")
try:
    p = Fetcher.get(URL, stealthy_headers=True, impersonate="chrome124", proxy=PROXY, retries=1, timeout=35)
    b = getattr(p, "body", b"") or b""
    print("OK", getattr(p, "status", "?"), len(b))
except Exception as e:
    print("FAIL", e)

print("=== StealthyFetcher ===")
try:
    p = StealthyFetcher.fetch(
        URL,
        headless=True,
        network_idle=False,
        timeout=60000,
        proxy=PROXY,
        disable_resources=True,
    )
    b = getattr(p, "body", b"") or b""
    print("OK", getattr(p, "status", "?"), len(b))
except Exception as e:
    print("FAIL", e)
