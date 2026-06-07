import os
import httpx

proxy = os.environ.get("CRAWL_HTTP_PROXY")
print("CRAWL_HTTP_PROXY:", proxy or "(unset)")
for name, url in [("shuyous", "https://www.shuyous.com/"), ("qishuxia", "https://www.qishuxia.com/")]:
    try:
        r = httpx.get(url, proxy=proxy, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
        print(f"{name}: {r.status_code} len={len(r.text)}")
    except Exception as e:
        print(f"{name}: ERR {e}")
