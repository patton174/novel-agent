"""One-shot import path migration for Phase 7 crawl package unification."""

from __future__ import annotations

import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]

REPLACEMENTS: list[tuple[str, str]] = [
    ("app.services.crawl_ai_extractor", "app.crawl.extract.ai_extractor"),
    ("app.services.crawl_content_client", "app.crawl.client"),
    ("app.services.crawl_job_executor", "app.crawl.job_executor"),
    ("app.services.crawl_scrapling", "app.crawl.fetch.scrapling"),
    ("app.services.crawl_browser", "app.crawl.fetch.browser"),
    ("app.services.crawl_mihomo", "app.crawl.fetch.mihomo"),
    ("app.services.crawl_fetch", "app.crawl.fetch.fetch"),
    ("app.services.crawl_proxy", "app.crawl.fetch.proxy"),
    ("app.services.crawl_goal", "app.crawl.goal"),
    ("app.services.crawl_agent", "app.crawl.runner"),
    ("app.services.novel_crawler", "app.crawl.runner"),
    ("app.crawl_orchestrator", "app.crawl.orchestrator"),
    ("app.crawl_agent", "app.crawl.agent"),
    ("app.core.crawl_metrics", "app.crawl.metrics"),
]

SCAN_DIRS = [ROOT / "app", ROOT / "tests", ROOT / "scripts"]


def migrate_file(path: pathlib.Path) -> bool:
    if path.name == "migrate_crawl_imports.py":
        return False
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    changed = 0
    for base in SCAN_DIRS:
        if not base.exists():
            continue
        for path in base.rglob("*.py"):
            if migrate_file(path):
                changed += 1
                print(f"updated: {path.relative_to(ROOT)}")
    print(f"done: {changed} files")


if __name__ == "__main__":
    main()
