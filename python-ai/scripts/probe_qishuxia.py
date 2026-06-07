"""Worker probe: qishuxia.com book page link structure."""
from __future__ import annotations

import re
from urllib.parse import urljoin

from app.crawl_agent.context import CrawlAgentContext
from app.services.crawl_fetch import fetch_for_crawl
from app.services.crawl_scrapling import fetch_page, page_links, page_text, _raw_html


class _Client:
    async def append_log(self, *args, **kwargs):
        pass


def _links_from_html(html: str, base: str, limit: int = 50) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for href, title in re.findall(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html, flags=re.I | re.S):
        text = re.sub(r"<[^>]+>", " ", title)
        text = " ".join(text.split())[:80]
        if href.startswith("#") or href.lower().startswith("javascript:"):
            continue
        out.append((text or href, urljoin(base, href)))
        if len(out) >= limit:
            break
    return out


def main() -> None:
    url = "https://www.qishuxia.com/book/2/"
    ctx = CrawlAgentContext(
        job_id="probe",
        entry_url=url,
        goal="probe",
        client=_Client(),  # type: ignore[arg-type]
    )
    page, meta = fetch_for_crawl(ctx, url)
    print(
        "meta",
        dict(
            status=meta.http_status,
            stealth=meta.used_stealth,
            links=meta.link_count,
            chars=meta.content_chars,
            blocked=meta.blocked,
        ),
    )
    links = page_links(page, url, limit=50)
    html = _raw_html(page)
    html_links = _links_from_html(html, url, 50)
    print(f"css_links={len(links)} html_regex_links={len(html_links)} html_len={len(html)}")
    for item in html_links[:25]:
        print(f"  html: {item[0]!r} -> {item[1]}")
    print("--- stealth css sample ---")
    for item in links[:10]:
        print(f"  css: {item}")
    p_http = fetch_page(url, stealth=False)
    print("http css links", len(page_links(p_http, url, 500)))
    print("text:", page_text(page, 400)[:400])


if __name__ == "__main__":
    main()
