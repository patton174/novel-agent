from scrapling.fetchers import Fetcher

r = Fetcher.get("https://www.shuyous.com/", stealthy_headers=True)
attrs = [x for x in dir(r) if not x.startswith("_")]
print("attrs", attrs)
for name in ("status", "status_code", "url", "html", "text", "body"):
    if hasattr(r, name):
        val = getattr(r, name)
        if isinstance(val, str):
            print(name, "len", len(val), "preview", repr(val[:120]))
        else:
            print(name, val)

from app.crawl.fetch.scrapling import page_text, page_links

print("page_text", len(page_text(r, 500)))
print("page_links", len(page_links(r, "https://www.shuyous.com/", 10)))
