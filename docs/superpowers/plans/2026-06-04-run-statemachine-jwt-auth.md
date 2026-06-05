# Run 状态机 + JWT 客户端安全层 实施计划

> **For agentic workers:** 按 Phase 顺序执行；每 Phase 结束需 `mvn compile` + 前端 build 验证。  
> **Spec:** `docs/superpowers/specs/2026-06-04-run-statemachine-jwt-auth-design.md`（用户已确认 2026-06-04）

**Goal:** 弃用 sa-token；JWT+Cookie 鉴权；Run 进 PG+MQ；Python 无状态 Worker。

**Architecture:** Content 写 PG；PyAI SSE/WS；Gateway 解密/验签；auth 管设备会话。

**Tech Stack:** Java 17, Spring Boot 3.2, Nimbus JWT, AES-GCM, RabbitMQ, React, FastAPI

**已确认默认值:** Cookie 域 `.novel-agent.cn`；心跳 60s/180s；SSE 不 AES；指纹误杀→二次验证（Phase 0b）；Chat+Run 迁 PG。

---

## Phase 0a — JWT + HttpOnly Cookie（当前）

- [x] `agent-common-security`：`JwtCodec`, `AesGcmCodec`, `AuthUnauthorizedException`
- [x] `agent-auth`：`JwtAuthService`, login/refresh/logout + Set-Cookie, 去 sa-token
- [x] `agent-gateway`：JWT 验签替换 Redis sa-token 键
- [x] `frontend`：内存 session + `credentials: 'include'`

## Phase 0b — 指纹 + 环境 + 心跳

- [x] `frontend/src/security/fingerprint.ts`, `envCollect.ts`, `heartbeat.ts`
- [x] `POST /api/auth/heartbeat`；Redis `auth:device:{sid}`
- [x] Gateway `FingerprintWebFilter`, `HeartbeatWebFilter`（warn 模式）

## Phase 0c — AES 请求加密

- [x] `requestCrypto.ts` + Gateway 解密链
- [x] `client-security.aes-required` feature flag（默认 false）

## Phase 0d — WS ticket

- [x] `POST /api/auth/ws-ticket`；前端 WS 改 ticket

## Phase 1–4

见 spec 第 8 节（PG Run 表、MQ、Worker、Redis session 退役）。

## Phase 1 — PG 表 + Content API（进行中）

- [x] JPA Entity：`agent_session/message/run/event/checkpoint/command`
- [x] `AgentRunStateMachine` + `AgentRunService`（lease / transition / events / commands）
- [x] Internal API `/internal/agent/**`（`X-Internal-Service-Key`）
- [x] Public API `/api/content/agent/runs/**`、`active-run`
- [x] Redis→PG 双写开关 `agent.runtime.pg-session-dual-write`
- [ ] PyAI 全量 queued 模式（Phase 3 Worker 接管执行）

## Phase 2 — 事件管道（进行中）

- [x] MQ Topic：`AGENT_RUN_DISPATCH` / `AGENT_RUN_EVENTS` / `AGENT_RUN_COMMAND`
- [x] Consumer：`AgentRunEventsListener` 落库 + Redis `run:live:{runId}` pub
- [x] `GET /runs/{id}/timeline`
- [x] PyAI `PgRunEventFanout` + Redis live 订阅（`pg-run-enabled` 开关）
- [ ] Consumer 与 Worker 端到端验收

## Phase 3 — 队列 + 无状态 Worker

- [ ] Python slice + checkpoint Worker 消费 dispatch
- [ ] 下线内存 RunSession / AgentRunRegistry
