from app.services.crawl_scrapling import fetch_page, page_links, page_text

URLS = [
    "https://www.shuyous.com/",
    "https://www.shuyous.com/rank.html",
    "https://www.shuyous.com/book/4057577.html",
]

for url in URLS:
    print("===", url)
    for stealth in (False, True):
        label = "stealth" if stealth else "http"
        try:
            page = fetch_page(url, stealth=stealth)
            text = page_text(page, 3000)
            links = page_links(page, url, limit=25)
            print(label, "type", type(page).__name__, "text_len", len(text), "links", len(links))
            print("preview:", repr(text[:500]))
            for item in links[:10]:
                print(" ", item)
        except Exception as exc:
            print(label, "ERR", exc)
    print()
