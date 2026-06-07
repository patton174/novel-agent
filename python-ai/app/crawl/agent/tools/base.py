"""Shared helpers for crawl agent tools."""

from __future__ import annotations

import json
from typing import Any

from app.crawl.agent.context import CrawlAgentContext
from app.crawl.fetch.proxy import pick_crawl_proxy


async def append_log(ctx: CrawlAgentContext, level: str, message: str) -> None:
    if ctx.job_id == "preview":
        return
    await ctx.client.append_log(ctx.job_id, level=level, message=message)


def json_ok(**payload: Any) -> str:
    return json.dumps({"ok": True, **payload}, ensure_ascii=False)


def json_err(message: str, **payload: Any) -> str:
    return json.dumps({"ok": False, "error": message, **payload}, ensure_ascii=False)


def crawl_proxy(ctx: CrawlAgentContext) -> str | None:
    return pick_crawl_proxy(ctx.site_config)
