# 模块 6：爬虫 agent 完善 — 设计文档（册 2）

> 本册含 §4 daemon 改造 + §5 前端 + §6 收尾；§1–§3 见 [册1](./2026-06-19-crawler-design.md)。

## §4 python 编排器 daemon 改造

### goal 从 Java 拉（DB 持久化）
`orchestrator/loop.py` `_one_cycle` 现从 `client.load_goal()` + `snapshot()` 取。改：
- `load_goal` → `GET /internal/orchestrator/state`（返回 DB：goal/enabled/pollSec）
- daemon 启动 + 每次 cycle 开头拉 state；enabled=false 则 sleep

### Redis 单例锁
`start_orchestrator_background` + `orchestrator_daemon` 改：
```python
async def orchestrator_daemon():
    while True:
        if acquire_lock("crawl:orchestrator:lock", ttl=poll*2):  # SETNX
            break
        await asyncio.sleep(poll)  # 未获锁等待
    try:
        while True:
            state = await client.get_state()
            if not state["enabled"]:
                await asyncio.sleep(poll); renew_lock(); continue
            await run_orchestrator_once(client)
            renew_lock()
            await wait_wake_or_timeout(poll)
    finally:
        release_lock()
```
- 崩溃：锁 TTL 过期 → 其他 worker 获锁续跑
- 周期续约防长 cycle 中锁过期

### 决策上报（已有，加 SSE 广播）
`client.record_decision(...)` 现调 Java `/internal/orchestrator/decision`。Java 落库 + 广播 SSE（§3）。python 不变。

### 唤醒
Java `PUT /state` / `wake` 后 `POST python /internal/orchestrator/wake`，python 设 `_wake_event` 唤醒 daemon（已有 `_wake_event` 机制，loop.py:127）。

### 按站限速
python fetch 层（`fetch/scrapling.py`）现 `crawl_request_delay_ms` 固定延迟。按站限速仅在 Java dispatch 前做（§3），python fetch 层保留固定 delay 作兜底，不重复限速。

## §5 前端

### CrawlerPage.tsx 改造
- **轮询改 SSE**：`GET /api/content/crm/crawl/stream`（EventSource），推 orchestrator_decision/job_status/job_log；移除 4s/12s 轮询
  - SSE 断开自动重连（EventSource 原生）
  - job 列表/状态实时更新；决策日志/日志终端实时追加
- **goal 持久化 UI**：orchestrator 卡 goal textarea "Set-and-Wake" → `PUT /orchestrator/state`（写 DB）；显示 updatedAt
- **调度信息**：job 行显示 priority 徽章（high/normal/low）、重试 `retry_count/max_retries`、schedule_cron；创建 job 弹窗加 priority/maxRetries/scheduleCron
- **限流提示**：start job 返回 429 时提示"爬虫并发已满，已排队"（QUEUED 状态）

### 新建 job 弹窗 CrawlJobCreateDialog.tsx
现 CrawlerPage 无创建 UI（job 由编排器创建），本模块补手动创建：
- sourceUrl + siteId + priority + maxRetries + scheduleCron(可选)
- 调 `POST /jobs`

### SSE hook useCrawlStream.ts
封装 EventSource，分发 decision/status/log 回调。

### API client 扩展（crawlAdminApi.ts）
```ts
createCrawlJob(req: { sourceUrl; siteId?; configJson?; priority?; maxRetries?; scheduleCron? })
getOrchestratorState() / setOrchestratorState(state)
wakeOrchestrator() / sleepOrchestrator()
```

### i18n
`admin:crawler.*` 加 priority/schedule/retry/429 提示文案。

### 最小可视路径
1. admin 设 goal → 编排器自动创建 job（按调度策略）
2. job 实时状态/日志经 SSE 推到页面
3. 429 时 job 排队，令牌释放后自动 dispatch
4. 失败自动重试（页面显示 retry_count），超 max_retries 标 FAILED

## §6 安全 / 测试 / 迁移 / 文件清单 / 边界

### 安全与限制
- **鉴权**：CRM 端点加 `AuthRoleSupport.requireAdmin`（现有 CRM 无角色门，本模块补）；`/internal/orchestrator/*` 走 X-Internal-Service-Key
- **令牌桶原子性**：Redis Lua 脚本 acquire/release，防竞态
- **单例锁**：SETNX + TTL + 周期续约，崩溃 TTL 过期自动转移
- **按站限速**：默认 1 req/2s（site_config.rate_limit 可配），防封
- **schedule_cron 校验**：Java 侧校验 cron 表达式合法（CronExpression）

### DB 迁移（V18__crawl_orchestrator.sql，content 模块）
- 建 `crawl_orchestrator_state` 单行表 + seed
- `crawl_job` 加 priority/max_retries/retry_count/schedule_cron/next_run_at + 索引
- `site_setting` seed `crawl.default_max_retries=3`

### 配置项
- Java `app.crawl.dispatch-token-capacity` = site_setting `crawl.max_concurrent_jobs`（默认 4，统一取代 python 默认 4 不一致）
- python `CRAWL_ORCHESTRATOR_ENABLED` 控制是否启动 daemon（默认 true，本模块完成后启用；单例锁保证多 worker 只一个跑）

### 测试
- **Java**：`CrawlTokenBucket` acquire/release（Lua）单测；`CrawlJobService.startJob` 令牌满 429/有空 dispatch 单测；`failJob` 重试 vs FAILED 单测；`CrawlScheduler` 定时扫描单测；`CrawlOrchestratorStateBiz` CRUD 单测；SSE 广播单测
- **python**：`orchestrator_daemon` 单例锁获/续/释单测（mock Redis）；`get_state` 从 Java 拉单测
- **集成**：设 goal → 编排器创建 job → SSE 推送 → 429 排队 → 令牌释放 dispatch → 失败重试 → 完成

### 关键文件清单

**Java（novel-studio）**
- `studio-module-content`：`entity/CrawlOrchestratorStateEntity` + Repo、`CrawlJobEntity` 扩展 5 字段、`service/crawl/CrawlTokenBucket`(Redis Lua)、`service/crawl/CrawlJobService` 改(startJob 令牌/failJob 重试)、`service/crawl/CrawlScheduler`(@Scheduled)、`service/crawl/CrawlOrchestratorStateBiz`、`service/crawl/CrawlSseBroadcaster`、`controller/crm/CrmCrawlController` 加 state/wake/sleep/stream 端点、`controller/internal/InternalOrchestratorController` 加 /state
- 迁移 `V18__crawl_orchestrator.sql`

**python-ai**
- `app/crawl/orchestrator/loop.py` 改（goal 从 Java 拉 + Redis 单例锁 + 续约）
- `app/crawl/orchestrator/client.py` 加 `get_state()`
- `app/core/redis_client.py`（模块5 已建，复用）

**前端**
- `src/pages/admin/CrawlerPage.tsx` 改（SSE 替轮询 + 调度信息）
- `src/components/admin/CrawlJobCreateDialog.tsx`（新建）
- `src/hooks/useCrawlStream.ts`（SSE）
- `src/api/crawlAdminApi.ts` 扩展
- i18n `admin:crawler.*`

### 范围边界（YAGNI，本模块不做）
- ❌ crawl→用户小说桥（`target_user_id` 死列留待后续）
- ❌ 用户侧爬取入口（仍 admin only）
- ❌ 爬虫结果去重/合并（同名小说跨站）
- ❌ 爬虫内容质量评分
- ❌ 多 region 代理池管理（现 mihomo 单组）
- ❌ 编排器 goal 版本历史（仅当前 goal）
- ❌ SSE 鉴权 token（用现有 JWT cookie）

### 风险与备注
- **EventSource 鉴权**：EventSource 不能设自定义 header，依赖 cookie 携带 JWT（现有 secureFetch 走 cookie/credentials）；CRM admin 鉴权靠 cookie + `AuthRoleSupport`
- **令牌泄漏**：job 异常终止（worker 崩溃）未 release 令牌 → 令牌桶容量虚减；TTL 兜底（令牌带过期）或定期对账（scan RUNNING job 数 vs 已发令牌）
- **daemon 锁脑裂**：长 cycle 续约失败未及时释放 → 双 daemon 短暂并存；orchestrator scheduler 进程内 `_local_inflight` 去重 + Redis 单例锁 TTL 兜底
- **SSE 连接数**：多 admin 同时开 CrawlerPage 多连接；限单连接/页面（EventSource 单例）+ 服务端 emitter 上限
- **python 单例 vs Java 调度**：编排器 daemon（python）创建 job，Java Scheduler 调度执行——两者解耦，daemon 单例只控"决策"，job 执行并发由 Java 令牌桶统一管
