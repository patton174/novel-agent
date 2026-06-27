# P0 — 基础体验与运维可见性

> **For agentic workers:** REQUIRED SUB-SKILL: subagent-driven-development. Checkbox steps.

**Goal:** 动态标题/图标、Admin 主机监控 snapshot、定时任务手动执行与运行历史。

**Architecture:** 纯 frontend hook + worker 聚合 API + scheduling 平台扩展；不引入新 Maven 业务模块。

**Tech Stack:** React i18next、OSHI 6.6.5、Spring Actuator、Redis job lock（已有）。

**索引：** [2026-06-26-platform-growth-ops-index.md](./2026-06-26-platform-growth-ops-index.md)

---

## Task 1: 路由文档元数据配置

**Files:**
- Create: `frontend/src/config/routeDocumentMeta.ts`
- Modify: `frontend/src/layouts/DashboardLayout.tsx` — 复用共享 map（可选 refactor）
- Modify: `frontend/src/layouts/AdminLayout.tsx` — 同上

- [ ] **Step 1:** 从 `DashboardLayout` / `AdminLayout` 提取 pathname → i18n key 映射到 `routeDocumentMeta.ts`
- [ ] **Step 2:** 补充 marketing/auth/editor/checkout 路由条目
- [ ] **Step 3:** 导出 `resolveMetaForPath(pathname)` 支持前缀匹配（`/admin/billing/*`）

---

## Task 2: useDocumentMeta Hook

**Files:**
- Create: `frontend/src/hooks/useDocumentMeta.ts`
- Modify: `frontend/src/App.tsx` — 在 `AppRoutes` 内调用
- Create: `frontend/public/novel-icon-dark.svg`
- Modify: `frontend/index.html` — 中性 fallback title

- [ ] **Step 1:** 实现 title = `{pageTitle} · {t('common:appName')}`
- [ ] **Step 2:** 同步 `document.documentElement.lang`（en → `en`，zh → `zh-CN`）
- [ ] **Step 3:** 随 `themeStore` 解析 dark 切换 favicon href
- [ ] **Step 4:** 依赖 `i18n.language` + `pathname` 重算
- [ ] **Step 5:** 写 Vitest：`resolveMetaForPath`、`useDocumentMeta` mock

**i18n keys（若无则加）：**
- `common:document.pageFallback`（可选）

---

## Task 3: OSHI 依赖与 HostMetrics

**Files:**
- Modify: `novel-studio/studio-module-worker/pom.xml`
- Create: `novel-studio/studio-module-worker/src/main/java/cn/novelstudio/module/worker/monitoring/HostMetricsSnapshot.java`
- Create: `.../monitoring/OshiHostMetricsProvider.java`

- [ ] **Step 1:** 添加 `oshi-core` 6.6.5
- [ ] **Step 2:** `HostMetricsSnapshot` record：cpuPercent, memoryTotal/used, diskTotal/used, uptimeSeconds
- [ ] **Step 3:** OSHI 采样（1s 间隔 CPU tick）；单元测试 mock `SystemInfo` 边界或使用集成测试 skip 标记

---

## Task 4: 监控聚合 API

**Files:**
- Create: `.../worker/service/crm/biz/WorkerCrmMonitoringBiz.java`
- Create: `.../worker/service/crm/resp/MonitoringSnapshotResp.java`
- Modify: `.../worker/controller/crm/WorkerCrmJobsController.java` 或新建 `WorkerCrmMonitoringController.java`
- Modify: `frontend/src/api/systemMonitoringApi.ts`
- Modify: `frontend/src/pages/admin/SystemMonitoringPage.tsx`

**API:** `GET /api/worker/crm/monitoring/snapshot`

Response 结构：
```json
{
  "host": { "cpuPercent": 12.3, "memoryUsedMb": 4096, "memoryTotalMb": 16384, "diskUsedGb": 120, "diskTotalGb": 500 },
  "services": [
    { "id": "novel-studio", "status": "up", "latencyMs": 45 },
    { "id": "python-ai", "status": "up", "latencyMs": 80 },
    { "id": "postgresql", "status": "up" },
    { "id": "redis", "status": "up" },
    { "id": "rabbitmq", "status": "up" }
  ],
  "jvm": { "heapUsedMb": 512, "heapMaxMb": 2048, "threads": 42, "uptimeSeconds": 86400 }
}
```

- [ ] **Step 1:** JVM 从 `MeterRegistry` / `Runtime` + Actuator beans
- [ ] **Step 2:** python-ai：`RestTemplate` GET `{pythonAiBaseUrl}/api/health`（配置项已有或新增 `app.monitoring.python-ai-url`）
- [ ] **Step 3:** PG/Redis/Rabbit 探活（Hikari、`StringRedisTemplate`、`RabbitTemplate`）
- [ ] **Step 4:** Frontend 卡片布局 + 状态色（up/degraded/down）
- [ ] **Step 5:** i18n `admin:monitoring.*`

---

## Task 5: 定时任务手动执行

**Files:**
- Modify: `novel-studio/studio-platform/studio-platform-scheduling/.../StudioJobRunner.java`
- Create: `.../JobManualRunner.java`
- Modify: `.../worker/service/crm/biz/WorkerCrmJobsBiz.java`
- Modify: `.../worker/controller/crm/WorkerCrmJobsController.java`
- Modify: `frontend/src/api/systemJobsApi.ts`
- Modify: `frontend/src/pages/admin/SystemJobsPage.tsx`
- Modify: `frontend/src/config/systemJobsCatalog.ts` — 补 translation/danmaku job i18n

**API:**
- `POST /api/worker/crm/jobs/{jobId}/run` → 202 + runId
- `GET /api/worker/crm/jobs/{jobId}/runs?limit=20`

**表（worker Flyway `V1__scheduled_job_run.sql` 或并入 billing 序号）：**
```sql
CREATE TABLE IF NOT EXISTS scheduled_job_run (
  id BIGSERIAL PRIMARY KEY,
  job_id VARCHAR(64) NOT NULL,
  trigger_type VARCHAR(16) NOT NULL, -- scheduled | manual
  status VARCHAR(16) NOT NULL,       -- running | success | failed
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  instance_id VARCHAR(128)
);
CREATE INDEX IF NOT EXISTS idx_scheduled_job_run_job_started ON scheduled_job_run(job_id, started_at DESC);
```

- [ ] **Step 1:** Flyway migration
- [ ] **Step 2:** `StudioJobRunner` / registrar 包装：run 开始/结束写 `scheduled_job_run`
- [ ] **Step 3:** `JobManualRunner.runNow(jobId)` — 仍走 Redis 锁；`trigger_type=manual`
- [ ] **Step 4:** Controller + `AuthRoleSupport.requireAdmin`
- [ ] **Step 5:** Admin UI Run 按钮 + 最近运行列表
- [ ] **Step 6:** 测试：`JobManualRunnerTest` mock Redis + job bean

---

## P0 验收

```bash
# Frontend
cd frontend && npx vitest run src/hooks/useDocumentMeta.test.ts src/i18n/i18n.test.ts

# Backend
cd novel-studio && mvn test -pl studio-modules/studio-module-worker,studio-platform/studio-platform-scheduling -am \
  "-Dtest=WorkerCrmMonitoring*,JobManualRunner*" "-Dsurefire.failIfNoSpecifiedTests=false"
```

手动：
1. `/pricing?lang=en` → tab 英文标题
2. 切换暗色 → favicon 变体
3. `/admin/system/monitoring` → 见 CPU/内存/磁盘
4. `/admin/system/jobs` → 手动 Run `site-content-translation` → history 有记录
