# Owner Java ↔ Python SSE 透传 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owner Java 持有一条 Python SSE 长连接并逐帧透传；queued 热路径不再走 MQ→HTTP worker slice；owner 失效冷恢复重开 SSE（非 MQ dispatch）。

**Architecture:** 
- Python 新增 `POST /internal/agent/run/stream`（internal key，绕过 `agent_allow_direct_stream=false`）
- Java `WebClientPythonAgentRunClient` 改连 internal SSE；`AgentBridgeService` 统一 owner coordinator 热路径（queued/legacy 合并）
- Resume：owner 本地 `journal replay + RunProxyLiveHub`；Cold：`HostRunColdFailoverService` 从 checkpoint 重开 coordinator SSE

**Tech Stack:** novel-studio (Java 21, WebClient/Reactor), python-ai (FastAPI SSE), Redis run:proxy sticky

---

## Task 1: Python internal SSE endpoint

**Files:**
- Create: `python-ai/app/agent/harness/owner/router.py`
- Modify: `python-ai/app/main.py`
- Modify: `python-ai/app/agent/router.py` (extract shared stream generator)

- [ ] **Step 1:** Extract `_build_run_stream_response(req)` from public router
- [ ] **Step 2:** Add `POST /internal/agent/run/stream` with `X-Internal-Service-Key`
- [ ] **Step 3:** Register router in `main.py`

## Task 2: Java WebClient → internal SSE

**Files:**
- Modify: `WebClientPythonAgentRunClient.java`

- [ ] **Step 1:** POST `/internal/agent/run/stream` + internal service key header
- [ ] **Step 2:** Verify compile

## Task 3: Unify hot path (remove MQ worker slice)

**Files:**
- Modify: `AgentBridgeService.java` — remove `pgRunStreamService.stream()` delegation
- Modify: `PgRunStreamService.java` — deprecate / delegate to bridge OR delete MQ dispatch body

- [ ] **Step 1:** Queued mode uses same `AgentRunCoordinator` + `RunProxyLiveHub` path
- [ ] **Step 2:** Remove `runMqPublisher.publishDispatchStart` from hot path
- [ ] **Step 3:** Browser disconnect always publishes recovering (not hostMode-only)

## Task 4: Resume + cold failover on SSE path

**Files:**
- Modify: `RunProxyResumeService.java` — local owner → `HostRunResumeStreamService`
- Modify: `RunProxyColdFailoverService.java` — always `HostRunColdFailoverService`

- [ ] **Step 1:** Resume no longer uses Redis live fanout for in-flight runs
- [ ] **Step 2:** Cold failover reopens Python SSE via coordinator

## Task 5: Verify

- [ ] **Step 1:** `mvn -pl studio-modules/studio-module-agent -am test -Dtest=RunProxyLiveHubTest`
- [ ] **Step 2:** Restart local CN dev stack

---

## Task 6: Dead code cleanup (no @Deprecated pile)

**Deleted (Java):** `PgRunStreamService`, `PgRunResumeStreamService`, `RunWorkerContextStore`, `AgentRunDispatchListener`, `AgentRunCommandListener`, `AgentRunDispatchMessage`, `AgentRunCommandMessage`; `MqTopic.AGENT_RUN_DISPATCH/COMMAND` removed.

**Deleted (Python):** `harness/worker/` execute path (`run_worker`, `router`, `schemas`); checkpoint moved to `harness/run_checkpoint.py`, `backend/content_run_client.py`; `worker_mode` / `WorkerSliceSession` removed from `run_query_loop`.

- [x] **Step 1:** Grep clean — no `publishDispatch`, `worker/run/execute`, `PgRunStreamService` in novel-studio/python-ai
- [x] **Step 2:** Tests updated (`test_run_checkpoint.py`)

---

## Progress log

| Time | Task | Status |
|------|------|--------|
| T0 | Plan written | done |
| T1 | Python `/internal/agent/run/stream` | done |
| T2 | Java WebClient → internal SSE + key | done |
| T3 | AgentBridgeService 统一 owner coordinator；去掉 queued→PgRunStreamService | done |
| T4 | Resume/Cold → HostRunResume + HostRunColdFailover (SSE) | done |
| T5 | 编译测试 + 重启本地栈 | done |
| T6 | Dead code cleanup（无遗留 worker dispatch） | done |
