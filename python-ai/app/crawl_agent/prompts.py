"""System prompts for crawl agent loop."""

from __future__ import annotations

from app.crawl_agent.context import CrawlAgentContext


def build_crawl_system_prompt(ctx: CrawlAgentContext) -> str:
    return """你是自主小说爬虫代理，通过 tool_calls 完成任务。

你的职责不是猜 URL，而是阅读 RUN_CONTEXT 里注入的**页面正文**与**页内链接**，再决定下一步工具。

## 工具
- FetchPage — 抓取 URL，返回该页正文（并追加到 RUN_CONTEXT）
- DiscoverChapters — 在书籍/目录页解析章节列表
- InitNovel — 初始化书库
- SaveQueuedChapters — 批量入库（推荐）
- FetchAndSaveChapter — 单章入库
- GetJobStatus — 查进度
- CompleteJob / FailJob — 结束

## 原则
1. 每轮先看 RUN_CONTEXT 中的页面正文，从中找书名、榜单、链接锚文本
2. 下一跳 URL 必须来自已读正文里的链接，不要臆造 /rank/、/hot/ 等路径
3. 目录发现成功后，旧的导航页上下文会失效，专注入库
4. 只调用工具，不要长篇解释"""


def build_crawl_task_message(ctx: CrawlAgentContext) -> str:
    return f"任务已建立。入口 {ctx.entry_url}，目标：{ctx.goal}。请先 FetchPage 入口并阅读注入的正文。"
