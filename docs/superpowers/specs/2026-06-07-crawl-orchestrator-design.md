# 爬虫主 Agent + 子任务编排 — 设计规格

> 日期：2026-06-07 · 状态：已批准 · 编排器：**全局唯一**（Worker 单实例）

## 目标

将爬虫从「单 URL 单 Job」升级为 **主 Agent 常驻编排 + 最多 10 并行子任务**，书库提供完整 CRUD，支持续爬检测，取消 200 章硬限制。

## 架构

- **主 Agent**（Python 常驻 loop）：读目标 → 查书库/任务 → 派发/停止子任务 → 无目标睡眠
- **子任务**（现有 CrawlJob + crawl_agent loop）：单书爬取或续爬
- **书库**（Java CatalogService + CRM API）：封面/摘要 CRUD、未完成列表
- **状态**（Redis）：`crawl:orchestrator:state` 存 goal/status/lastDecision

## 主 Agent 工具

GetOrchestratorGoal, SetOrchestratorGoal, ClearOrchestratorGoal, ListCatalogNovels, GetCatalogProgress, ListCrawlJobs, GetCrawlJobStatus, CreateCrawlJob, StopCrawlJob, GetRunningJobCount, Sleep, CompleteGoal

## 约束

- 同时 RUNNING 子任务 ≤ 10
- `max_chapters=0` 表示不限章节
- 订阅/代理配置沿用 Worker Clash

## 前端

爬虫面板三 Tab：编排 | 书库 | 任务
