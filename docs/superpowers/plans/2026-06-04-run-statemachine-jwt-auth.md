# Run 状态机 + JWT 客户端安全层 实施计划

> ⚠️ **历史设计记录**。生产已迁移至 **novel-studio 单体**，现状以 `CLAUDE.md` / `.cursor/rules/project-architecture.mdc` 为准。本文保留作历史参考，**勿据以部署**（旧微服务 agent-gateway/auth/pyai/content/consumer 与 `restart-dev.sh` 均已废弃）。

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
- [x] `client-security.aes-required` feature flag
- [x] 生产 `VITE_SECURITY_AES=true` + Nacos `aes-required: true`（见 `apply-enable-aes-online.sh`）

## Phase 0e — 路由脱敏 + 字段/值加密

- [x] 设计：`docs/superpowers/specs/2026-06-05-client-route-field-crypto-design.md`
- [x] Gateway `RouteObfuscationFilter` + `FieldPayloadExpandFilter`
- [x] `GET /api/auth/crypto-manifest` + Redis manifest 发布脚本
- [ ] Nacos 开启 `route-obfuscation` / `field-encryption` + 前端 env 对齐后线上验收

## Phase 0d — WS ticket

- [x] `POST /api/auth/ws-ticket`；前端 WS 改 ticket

## Phase 1–4

见 spec 第 8 节（PG Run 表、MQ、Worker、Redis session 退役）。

## Phase 1 — PG 表 + Content API

- [x] JPA Entity：`agent_session/message/run/event/checkpoint/command`
- [x] `AgentRunStateMachine` + `AgentRunService`（lease / transition / events / commands）
- [x] Internal API `/internal/agent/**`（`X-Internal-Service-Key`）
- [x] Public API `/api/content/agent/runs/**`、`active-run`
- [x] Redis→PG 双写开关 `agent.runtime.pg-session-dual-write`
- [ ] PyAI 全量 queued 模式（需 Nacos `agent.runtime.mode=queued` 已发布 + 验收）

## Phase 2 — 事件管道

- [x] MQ Topic：`AGENT_RUN_DISPATCH` / `AGENT_RUN_EVENTS` / `AGENT_RUN_COMMAND`
- [x] Consumer：`AgentRunEventsListener` 落库 + Redis `run:live:{runId}` pub
- [x] `GET /runs/{id}/timeline`
- [x] PyAI `PgRunEventFanout` + Redis live 订阅（`pg-run-enabled` 开关）
- [ ] Consumer 与 Worker 端到端验收

## Phase 3 — 队列 + 无状态 Worker

- [x] Python slice + checkpoint Worker（`python-ai/app/agent_step/worker/`）
- [x] Consumer `AgentRunDispatchListener` → Python Worker
- [x] PyAI queued 模式代码路径（`PgRunStreamService` / `RunWorkerContextStore`）
- [ ] 线上 Nacos queued 配置稳定发布 + E2E 验收
- [ ] 下线内存 RunSession / AgentRunRegistry（legacy 双轨仍保留）

## 线上部署状态（2026-06-05）

- [x] 前端 JWT 安全客户端 + CI 热部署
- [x] MW auth/gateway JWT 版 jar（需 `JWT_SECRET` ≥32 字符，见 `apply-mw-jwt-env.sh`）
- [x] Worker content/pyai/consumer/python-ai Phase3 手动部署过
- [ ] CI 全绿 + 登录/Agent 流 E2E 通过
