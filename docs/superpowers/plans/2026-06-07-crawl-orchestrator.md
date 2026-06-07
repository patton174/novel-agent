# Crawl Orchestrator Implementation Plan

> **Goal:** 全局唯一主 Agent + 书库 CRM + 去 200 章限制 + 面板三 Tab

**Architecture:** Java 存 orchestrator 状态与 catalog CRUD；Python 常驻 orchestrator loop；子任务沿用 CrawlJob/MQ。

**Tech Stack:** Spring Boot, Redis, FastAPI, LangChain bind_tools, React

---

### Phase 1: 书库 CRM + 去章节上限
- CatalogService CRUD、CrmCatalogController、crypto-routes
- Python max_chapters=0 不限

### Phase 2: Orchestrator 状态 + Internal/CRM API
- CrawlOrchestratorStateService (Redis)
- Internal + CRM endpoints

### Phase 3: Python orchestrator loop + 启动
- crawl_orchestrator/*, main.py startup

### Phase 4: 前端三 Tab
- catalogAdminApi, orchestratorAdminApi, CrawlerPage
