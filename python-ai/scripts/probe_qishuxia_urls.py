"""Probe multiple qishuxia URLs — what AI would see via FetchPage."""
from __future__ import annotations

from app.crawl_agent.context import CrawlAgentContext
from app.services.crawl_fetch import fetch_for_crawl
from app.services.crawl_scrapling import page_links, page_text


class _Client:
    async def append_log(self, *args, **kwargs):
        pass


def main() -> None:
    urls = [
        "https://www.qishuxia.com/",
        "https://www.qishuxia.com/wangyouxiaoshuo/",
        "https://www.qishuxia.com/wangyou/",
        "https://m.qishuxia.com/",
        "https://www.qishuxia.com/book/2/",
    ]
    ctx = CrawlAgentContext(
        job_id="probe",
        entry_url="https://www.qishuxia.com/",
        goal="网游小说",
        client=_Client(),  # type: ignore[arg-type]
    )
    for url in urls:
        ctx.use_stealth = False
        page, meta = fetch_for_crawl(ctx, url, use_cache=False)
        links = page_links(page, url, 20)
        body = page_text(page, 600)
        print("===", url)
        print(
            "status", meta.http_status,
            "stealth", meta.used_stealth,
            "blocked", meta.blocked,
            "links", len(links),
            "chars", meta.content_chars,
        )
        print("preview:", body[:400].replace("\n", " "))
        for item in links[:8]:
            print(f"  {item.get('title', '')[:40]!r} -> {item.get('url')}")
        print()


if __name__ == "__main__":
    main()
