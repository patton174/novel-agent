# 模块 6：爬虫 agent 完善 — 设计文档（册 1）

> 范围：编排器可用化（goal 持久化+状态 / SSE 实时推送 / 崩溃恢复+单例 / 调度策略可配）+ 分布式并发控制（Java 侧令牌桶）。
> 不做：crawl→用户小说桥、用户侧爬取入口。
> 本册含 §1 架构 + §2 数据模型 + §3 API；§4–§6 见 [册2](./2026-06-19-crawler-design-part2.md)。
> 状态：已通过 brainstorming 全部 6 节确认，待用户复核后转 writing-plans。

## 背景与目标

爬虫 per-job agent + orchestrator 编排器（默认关 `CRAWL_ORCHESTRATOR_ENABLED=false`）完整可用，但：编排器 goal 仅 Python 内存/未持久化、单进程 daemon 无崩溃恢复/跨 worker 单例、并发仅进程内 Semaphore（多 worker 全局并发失控）、无 SSE 实时推送（前端轮询）、调度策略不可配（无优先级/定时/重试/按站限速）。crawl 输出仅入公共目录（`target_user_id` 死列），无 crawl→用户小说桥。

本模块交付：
1. 编排器可用化：goal 存 DB + Redis 锁单例 + 崩溃重启续跑 + SSE 实时推送 + 调度策略可配（优先级/定时/重试/按站限速）
2. 分布式并发上移 Java：令牌桶（Redis Lua）dispatch 限流，python 仅执行
3. admin CrawlerPage 轮询改 SSE + 调度信息展示 + 手动创建 job 弹窗

## 现状关键事实

- python `app/crawl/orchestrator/loop.py` daemon：`orchestrator_daemon` 长轮询（poll_sec），`_one_cycle` 绑 `ORCHESTRATOR_TOOLS` 到 plan LLM；`start_orchestrator_background`（main.py:61）按 `crawl_orchestrator_enabled` 启动
- goal 来源：`client.load_goal()` + `snapshot()`（OrchestratorClient），非 DB 持久化
- 并发：`job_executor.py` 进程内 `asyncio.Semaphore(max_concurrent_jobs=4)`，`/internal/crawl/execute` 429 仅守单进程；`scheduler.py` `_local_inflight` 进程内
- Java `CrawlJobService.startJob`（:87）发 `MqTopic.CRAWL_DISPATCH` → `CrawlDispatchListener` → python `/internal/crawl/execute`
- `CrawlJobEntity.target_user_id` 死列（V2 迁移建，无代码读写）；输出仅 `crawl_catalog_*`
- `crawl_job` 无 priority/retry/schedule 字段；`site_setting` 有 `crawl.max_concurrent_jobs`(seed '2')
- 前端 `CrawlerPage.tsx`（admin）4s/12s 轮询，无创建 job UI（job 由编排器创建）
- crawl LLM `get_crawl_llm_config`（config.py:155），独立 profile="crawl"

## §1 架构总览

```
[ Admin CrawlerPage ]              [ novel-studio :8080 ]                    [ python-ai :8000 ]
  设 goal/查看状态 ──CRM──→  CrmCrawlController                         orchestrator daemon
  SSE 实时日志/状态 ←──SSE──  ├ goal 存 DB(crawl_orchestrator_state)      (Redis 锁单例，崩溃重启续跑)
                            ├ 令牌桶限流(dispatch 前获取令牌)               从 Java 拉 goal → 编排 → 创建 job
                            ├ 优先级队列(dispatch 按 priority)              ↓
                            ├ 定时扫描(schedule 到点发 job)            CrawlDispatchListener
                            └ 失败重试(retry_count<max)                 ← MQ ← Java dispatch
                                                                  run_bounded → execute_crawl_job
                                                                  (按站限速 Java 侧已做，python 兜底)
```

### 核心调整
- **并发上移 Java**：`CrawlJobService.startJob` dispatch 前 acquire 令牌桶（Redis Lua 原子），失败 429；python `run_bounded` 进程内 Semaphore 降为兜底
- **goal 持久化**：新表 `crawl_orchestrator_state`（单行），Python daemon 启动+周期从 Java `/internal/orchestrator/state` 拉；CrawlerPage 改 goal 写 DB
- **daemon 单例**：Redis SETNX `crawl:orchestrator:lock`（TTL=poll×2，周期续约）；崩溃重启重新获锁续跑
- **调度策略**：`crawl_job` 加 priority/max_retries/retry_count/schedule_cron/next_run_at；Java `CrawlScheduler`（@Scheduled）扫描定时 job；dispatch 按 priority 出队；失败 retry_count<max 自动重试（退避）；按站限速 Redis `crawl:rate:{host}`
- **SSE 实时推送**：`GET /api/content/crm/crawl/stream` 推 orchestrator 决策/job 状态/job 日志；前端轮询改 SSE

## §2 数据模型

### crawl_orchestrator_state（编排器状态，单行）
```sql
CREATE TABLE crawl_orchestrator_state (
    id          SMALLINT PRIMARY KEY DEFAULT 1,
    goal        TEXT,
    enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    poll_sec    INTEGER NOT NULL DEFAULT 30,
    updated_at  TIMESTAMPTZ NOT NULL,
    CONSTRAINT singleton CHECK (id = 1)
);
INSERT INTO crawl_orchestrator_state (id, goal, enabled, poll_sec, updated_at)
VALUES (1, NULL, FALSE, 30, NOW()) ON CONFLICT (id) DO NOTHING;
```

### crawl_job 扩展（调度字段）
```sql
ALTER TABLE crawl_job ADD COLUMN IF NOT EXISTS priority        SMALLINT NOT NULL DEFAULT 1;  -- 0=high 1=normal 2=low
ALTER TABLE crawl_job ADD COLUMN IF NOT EXISTS max_retries     SMALLINT NOT NULL DEFAULT 3;
ALTER TABLE crawl_job ADD COLUMN IF NOT EXISTS retry_count     SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE crawl_job ADD COLUMN IF NOT EXISTS schedule_cron   VARCHAR(64);
ALTER TABLE crawl_job ADD COLUMN IF NOT EXISTS next_run_at     TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_crawl_job_dispatch ON crawl_job (status, priority, created_at)
    WHERE status IN ('PENDING','QUEUED');
CREATE INDEX IF NOT EXISTS idx_crawl_job_schedule ON crawl_job (next_run_at)
    WHERE schedule_cron IS NOT NULL AND status = 'PENDING';
```

### Redis（不入库）
- 并发令牌 `crawl:dispatch:token` —— 全局令牌桶（容量 = `crawl.max_concurrent_jobs`，默认 4），Lua 原子 acquire/release
- 按站限速 `crawl:rate:{host}` —— 每 host 独立令牌桶（容量+补充速率 = site_config.rate_limit，默认 1 req/2s）
- daemon 单例锁 `crawl:orchestrator:lock` —— SETNX TTL=poll×2，周期续约

### site_setting（已有表）
- `crawl.max_concurrent_jobs`（seed V6，现 '2'）—— 令牌桶容量，Java 真正消费（统一取代 python 默认 4 不一致）
- `crawl.default_max_retries`（新 seed = 3）

### 实体
`CrawlOrchestratorStateEntity` + Repo；`CrawlJobEntity` 扩展 5 字段。

## §3 API 契约

### 现有端点（改造）
```
POST   /api/content/crm/crawl/jobs              创建（CreateCrawlJobRequest 加 priority/maxRetries/scheduleCron）
POST   /api/content/crm/crawl/jobs/{id}/start   启动 → 令牌桶 acquire → 失败 429 → 成功发 MQ
GET    /api/content/crm/crawl/jobs/page         列表（加 priority/重试信息）
```

### 新增：编排器状态
```
GET  /api/content/crm/crawl/orchestrator/state   → { goal, enabled, pollSec, updatedAt }
PUT  /api/content/crm/crawl/orchestrator/state   body: { goal?, enabled?, pollSec? }
   → 写 DB + POST python /internal/orchestrator/wake
POST /api/content/crm/crawl/orchestrator/wake    唤醒
POST /api/content/crm/crawl/orchestrator/sleep   休眠（enabled=false + wake）
```
python daemon 从 Java `GET /internal/orchestrator/state`（内网）拉。

### 新增：SSE 实时流
```
GET /api/content/crm/crawl/stream   (SSE, admin 鉴权)
  事件：orchestrator_decision { decision, ts } / job_status { jobId, status, ts } / job_log { jobId, level, message, ts }
  Java 内部 SSE emitter 广播；决策/状态变更/日志写入时广播
```
python 决策日志现 POST Java `/internal/orchestrator/decision` → Java 落库 + 广播 SSE。

### 调度（Java @Scheduled，无端点）
`CrawlScheduler`（@Scheduled fixedDelay=60s）扫描 `next_run_at <= now AND schedule_cron IS NOT NULL AND status=PENDING` → startJob；扫描 QUEUED+next_run_at 到点重试 dispatch。

### 令牌桶（Java dispatch 前）
`CrawlJobService.startJob` 改：
1. acquire `crawl:dispatch:token`（Lua）→ 失败 429 "crawl at capacity"
2. acquire `crawl:rate:{host}` → 失败 job 置 QUEUED（Scheduler 重试 dispatch）
3. 发 MQ；job 完成/失败/取消时 release 令牌

### 失败重试
`CrawlJobService.failJob`：retry_count<max_retries → retry_count++、status=QUEUED、next_run_at=now+退避(2^retry_count×30s)；否则 FAILED。

### 鉴权
- `/api/content/crm/crawl/*`：admin（补 `AuthRoleSupport.requireAdmin`，与模块3/5 一致）
- `/internal/orchestrator/*`：X-Internal-Service-Key

---
§4 daemon 改造 + §5 前端 + §6 收尾 见 [册2](./2026-06-19-crawler-design-part2.md)。
