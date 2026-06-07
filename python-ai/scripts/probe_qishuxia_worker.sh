#!/bin/bash
docker exec -e PYTHONPATH=/app novel-agent-worker-python-ai-1 python <<'PY'
from app.crawl.fetch.scrapling import fetch_page_with_retry, page_links, page_text

for url in [
    "https://www.qishuxia.com/",
    "https://www.qishuxia.com/wangyouxiaoshuo/",
    "https://www.qishuxia.com/book/2/",
]:
    p, m = fetch_page_with_retry(url)
    links = page_links(p, url, 12)
    print("URL", url)
    print("  status", m.http_status, "stealth", m.used_stealth, "blocked", m.blocked, "links", len(links))
    print("  text", page_text(p, 350)[:350].replace("\n", " "))
    for L in links[:6]:
        print("   ", L.get("title", "")[:35], "->", L.get("url", ""))
    print()
PY
