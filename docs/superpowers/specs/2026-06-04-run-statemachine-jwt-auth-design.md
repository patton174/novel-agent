# Run 状态机（PostgreSQL + 队列）与 JWT 鉴权替换设计

> ⚠️ **历史设计记录**。生产已迁移至 **novel-studio 单体**，现状以 `CLAUDE.md` / `.cursor/rules/project-architecture.mdc` 为准。本文保留作历史参考，**勿据以部署**（旧微服务 agent-gateway/auth/pyai/content/consumer 与 `restart-dev.sh` 均已废弃）。

> 日期：2026-06-04  
> 状态：**待评审（已扩展客户端安全层）**  
> 关联：`docs/superpowers/specs/2026-05-27-java-python-agent-runtime-design.md`

## 1. 背景与目标

### 1.1 现状问题

| 问题 | 根因 |
|------|------|
| AskUser 后无响应 | Run / interaction 在进程内存；多实例 LB 漂移 |
| 重启丢 Run | `RunSession`、`AgentRunRegistry`、`AgentRunEventJournal` 均无持久化 |
| sa-token 踩坑 | Servlet 与 WebFlux 混用、Redis 键与网关手写校验、无 refresh 实现 |
| 会话历史脆弱 | Chat session/message 仅在 Redis，无 PG 审计与回放 |

### 1.2 目标

1. **Run 状态机进 PostgreSQL（Content 模块）**，事件 append-only，可回放、可审计。
2. **RabbitMQ 编排队列**，Python **无状态 Worker** 拉取「下一步」，支持多 Worker 水平扩展。
3. **弃用 sa-token**，改为 **JWT + HttpOnly Cookie + 客户端安全层**（指纹 / 心跳 / 环境采集 / AES 参数字段加密）。
4. 与 2026-05-27 运行时设计对齐，补齐当时未落地的表与队列。

### 1.3 非目标（本阶段不做）

- OAuth2 第三方登录（微信/GitHub）
- 多租户 / 组织级 RBAC
- Kafka 替换 RabbitMQ
- Python 直连 PostgreSQL（仍由 Java/Content 写库）

---

## 2. 目标架构总览

```text
┌──────────┐ Cookie+AES ┌─────────┐ decrypt/verify ┌──────┐
│ Frontend │ ──────────► │ Gateway │ ──────────────► │ PyAI │
│ fp/env/  │  heartbeat  └─────────┘  X-User-Id     └──────┘
│ heartbeat│      ▲              ┌──────────┐
└──────────┘      └──────────────│ Content  │◄── PG run/event + auth_device
                                └────┬─────┘
                                     │ RabbitMQ → Python Worker×N
```

**职责边界**

| 组件 | 职责 |
|------|------|
| **Gateway** | JWT 验签、注入 `X-User-Id`、路由 |
| **PyAI** | SSE/WS 出口、创建 Run、投递队列、订阅 live events、不写 PG |
| **Content** | PG 唯一写入口：session/message/run/event/checkpoint/command |
| **Consumer** | 异步：events 批量落库、DLQ、对账（可选） |
| **Python Worker** | 消费 dispatch/resume job，调 LLM/tools，发 events 到 MQ |

---

## 3. 鉴权与安全层（JWT + Cookie + 反爬）

> **结论**：采用 **JWT Access + Refresh（Redis）** 作为身份底座，并在其上叠加 **HttpOnly Cookie 注入、AES 请求体加密、浏览器指纹绑定、心跳续期、环境信息采集**。  
> 说明：前端 JS 可被逆向，本方案目标是 **抬高脚本/爬虫成本** 与 **会话劫持检测**，不是绝对防破解。

### 3.1 身份底座（JWT + Cookie）

| 凭证 | 存放 | TTL | 说明 |
|------|------|-----|------|
| **Access JWT** | 内存（`AuthSessionStore`）+ 可选 `na_at` HttpOnly Cookie | 15–60 min | Claims：`sub`, `sid`, `roles`, `fp_hash`, `jti` |
| **Refresh Token** | `na_rt` HttpOnly Cookie | 30 d | 随机 UUID；Redis `auth:refresh:{id}` |
| **Session 绑定包** | `na_sess` HttpOnly Cookie（AES 加密 blob） | 与 refresh 同步 | 含 `sid`, `userId`, `deviceId`, `issuedAt`, `keyVersion` |
| **CSRF Token** | `na_csrf`（可读 Cookie）+ Header `X-CSRF-Token` | session | 双提交 Cookie 模式 |

**登录成功响应**

```http
Set-Cookie: na_rt=...; HttpOnly; Secure; SameSite=Lax; Path=/api/auth
Set-Cookie: na_sess=<AES-GCM blob>; HttpOnly; Secure; SameSite=Strict; Path=/
Set-Cookie: na_csrf=...; Secure; SameSite=Strict; Path=/
Content-Type: application/json

{
  "userId": 3,
  "username": "...",
  "expiresIn": 3600,
  "sessionCrypto": {
    "keyId": "k_20260604_01",
    "aesKeyB64": "...",        // 仅登录/refresh 时下发的会话 AES 密钥（内存保存，不落 localStorage）
    "keyVersion": 1,
    "expiresAt": "..."
  },
  "heartbeatIntervalSec": 60
}
```

- **不再**使用 `localStorage` 存 token（消除 XSS 窃取面）。
- WebSocket：短效 `wsTicket`（60s，一次性）由 `POST /api/auth/ws-ticket` 签发，query 传 ticket（替代长期 JWT 进 URL）。

### 3.2 客户端安全层架构

```text
登录
  ├─ 采集 env + fingerprint → POST /api/auth/login（明文密码字段仍 TLS 保护）
  ├─ 后端校验凭证 + 绑定 sid + 写 Redis 设备会话
  └─ Set-Cookie + 下发 sessionCrypto.aesKey（内存）

每次 API 请求（Gateway 保护路径）
  ├─ Header: X-Request-Id, X-Timestamp, X-Nonce, X-Fingerprint, X-CSRF-Token
  ├─ Body: { "v":1, "kid":"...", "iv":"...", "ct":"...", "fields":{...} }
  │         └─ AES-256-GCM 加密 JSON；敏感字段可单独 field 级加密
  └─ Gateway 链：CSRF → 解密 → 指纹/心跳 → JWT → 路由

并行：HeartbeatWorker 每 60s POST /api/auth/heartbeat（轻量 AES 包 + fp + env 增量）
```

### 3.3 AES 参数字段加密

**算法**：AES-256-GCM，每请求随机 12-byte IV，附加 auth tag。

**请求 Envelope**（`Content-Type: application/json` 或 `application/vnd.novel-agent.enc+json`）：

```json
{
  "v": 1,
  "kid": "k_20260604_01",
  "ts": 1717500000000,
  "nonce": "uuid",
  "iv": "base64",
  "ct": "base64(ciphertext+tag)",
  "fields": {
    "password": { "iv": "...", "ct": "..." }
  }
}
```

- **整包加密**：`ct` 解密后得到原始 JSON body（业务 API 通用）。
- **字段级加密**：登录密码、手机号等额外走 `fields.*`（双保险 + 日志脱敏友好）。
- **防重放**：Gateway 校验 `ts` 窗口 ±120s；Redis `auth:nonce:{sid}:{nonce}` SETNX TTL 5min。
- **密钥轮换**：`keyVersion` 递增；refresh 时可轮换 `aesKey`；旧 key 保留 24h 兼容。

**Gateway 过滤器顺序**（WebFlux，`order` 从小到大）：

1. `CsrfWebFilter`
2. `RequestDecryptWebFilter` — 解密 body，还原 `ServerHttpRequestDecorator`
3. `ReplayGuardWebFilter` — ts + nonce
4. `ClientSessionWebFilter` — 解析 `na_sess` cookie，加载 Redis `auth:device:{sid}`
5. `FingerprintWebFilter` — 比对 `X-Fingerprint` 与绑定 hash（允许小幅漂移）
6. `HeartbeatWebFilter` — 要求 `lastHeartbeatAt` < 3min（白名单：login/refresh/heartbeat）
7. `JwtAuthWebFilter` — 验 access JWT / cookie
8. 原有 `AuthGatewayFilter` 逻辑合并进 7

**豁免路径**（不 AES、不心跳，仅 TLS）：`/api/auth/login`, `/api/auth/register`, `/actuator/health`, 静态资源。

**SSE / 大 body**：Agent stream 可仅用 JWT + 指纹 + 心跳，body **可选**加密（feature flag `agent.security.encrypt-stream=false` 默认关，避免 CPU 瓶颈）。

### 3.4 浏览器指纹

**前端采集**（`frontend/src/security/fingerprint.ts`）：

| 信号 | 用途 |
|------|------|
| User-Agent、语言、时区 | 基础 |
| screen、colorDepth、deviceMemory | 设备 |
| Canvas / WebGL renderer hash | 稳定指纹 |
| `navigator.hardwareConcurrency` | 设备 |
| 触摸/指针能力 | _bot 检测 |

输出：`fingerprint = SHA256(canonicalJson)` → Header `X-Fingerprint`。

**后端**（auth 模块）：

- 登录时存 Redis：`auth:device:{sid}` → `{ userId, fpHash, fpComponents, riskScore, lastSeenAt }`
- 后续请求：Hamming 距离 / 分量加权；漂移过大 → 403 `DEVICE_MISMATCH` 或强制 re-login
- PG 表 `auth_device_session`（审计、风控）：

```sql
CREATE TABLE auth_device_session (
  id              VARCHAR(64) PRIMARY KEY,
  user_id         BIGINT NOT NULL,
  fingerprint_hash VARCHAR(64) NOT NULL,
  fingerprint_raw JSONB,
  env_snapshot    JSONB,
  risk_score      INT DEFAULT 0,
  last_heartbeat  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ
);
```

### 3.5 心跳（Heartbeat）

**端点**：`POST /api/auth/heartbeat`

**频率**：默认 60s（登录响应 `heartbeatIntervalSec` 可配置）。

**请求**（AES 加密小包）：

```json
{
  "sid": "...",
  "ts": 1717500060000,
  "fingerprint": "...",
  "envDelta": { "visibility": "visible", "online": true },
  "activeRunIds": ["run_xxx"]
}
```

**后端**：

- 更新 Redis `auth:device:{sid}.lastHeartbeatAt`
- 可选：env 增量 append 到 `auth_env_log`（PG 或 Redis stream）
- 超时：Gateway `HeartbeatWebFilter` 拒绝业务 API（返回 401 + `HEARTBEAT_REQUIRED`）
- 页面 `visibility=hidden` 仍发低频心跳（180s），避免误杀切 tab

**前端**：`HeartbeatWorker` 在 `App` 根组件启动；logout 停止。

### 3.6 环境信息采集

**采集时机**：登录一次全量 + 心跳增量。

**全量 env**（`frontend/src/security/envCollect.ts`）：

```json
{
  "ua": "...",
  "platform": "Win32",
  "languages": ["zh-CN"],
  "timezone": "Asia/Shanghai",
  "screen": { "w": 1920, "h": 1080, "dpr": 1 },
  "connection": { "effectiveType": "4g" },
  "cookieEnabled": true,
  "webdriver": false,
  "pluginsCount": 0,
  "touchSupport": false,
  "clientVersion": "1.0.0"
}
```

**用途**：

- 登录风控（`webdriver=true` 加分）
- 审计与客诉排查
- **不**用于前端业务逻辑

存储：Redis 热数据 + PG `auth_env_log(session_id, snapshot, created_at)` 冷归档。

### 3.7 服务改动汇总

| 模块 | 新增/改动 |
|------|-----------|
| **agent-common-security**（新模块） | `AesGcmCodec`, `NonceStore`, `FingerprintMatcher`, DTO |
| **agent-auth** | 去 sa-token；`JwtService`, `DeviceSessionService`, login/refresh/logout/heartbeat/ws-ticket；Set-Cookie；PG `auth_device_session` |
| **agent-gateway** | 过滤器链 3.3；解密后转发明文 body 给下游 |
| **agent-content / pyai** | 内网仍信 `X-User-Id`；可选校验 `X-Session-Id` |
| **frontend** | `security/`：`sessionStore`, `requestCrypto`, `fingerprint`, `envCollect`, `heartbeat`, `secureFetch` 包装现有 API |

**配置（Nacos）**

```yaml
auth:
  jwt:
    issuer: novel-agent
    secret: ${JWT_SECRET}
    access-ttl-seconds: 3600
    refresh-ttl-seconds: 2592000
  client-security:
    enabled: true
    aes-required: true              # 全局 AES；stream 可单独关
    encrypt-stream: false
    replay-window-seconds: 120
    heartbeat-max-silence-seconds: 180
    fingerprint-tolerance: 0.15     # 分量漂移阈值
  cookie:
    domain: .novel-agent.cn
    secure: true
    same-site: Lax
```

### 3.8 迁移策略

1. **Feature flag 分步**：`client-security.enabled=false` 时仅 JWT Cookie，与旧前端兼容。
2. 上线顺序：JWT Cookie → 前端发指纹/env → 开 AES → 开心跳强制。
3. 删除 sa-token 全部依赖与 Redis `Authorization:login:token:*` 键。
4. 文档告知：**本地 DIRECT_PYTHON 调试** 可走 `VITE_SECURITY_BYPASS=true`（仅 dev）。

### 3.9 风险与诚实边界

| 项 | 说明 |
|----|------|
| 前端密钥 | `sessionCrypto.aesKey` 在内存，刷新页需 refresh 恢复；攻击者仍可从 DevTools 抓包 |
| CPU | 全量 AES 增加 Gateway CPU；stream 默认不加密 |
| 误杀 | 指纹漂移、VPN 切换可能 403；需「重新验证设备」流程 |
| 合规 | env 采集需隐私政策告知；提供关闭非必要采集开关（保留安全必需项） |

---

## 4. Run 状态机（PostgreSQL）

### 4.1 表设计（Content 模块，Flyway/Liquibase 或 JPA ddl-auto）

在 2026-05-27 草案基础上扩展：

#### `agent_session`

```sql
CREATE TABLE agent_session (
  id            VARCHAR(64) PRIMARY KEY,
  user_id       BIGINT NOT NULL,
  novel_id      VARCHAR(64),
  title         VARCHAR(256),
  status        VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_agent_session_user ON agent_session(user_id, updated_at DESC);
```

#### `agent_message`

```sql
CREATE TABLE agent_message (
  id            VARCHAR(64) PRIMARY KEY,
  session_id    VARCHAR(64) NOT NULL REFERENCES agent_session(id),
  run_id        VARCHAR(64),
  role          VARCHAR(16) NOT NULL,  -- user | assistant | system
  content       TEXT,
  status        VARCHAR(32) NOT NULL,  -- pending | streaming | completed | failed
  created_at    TIMESTAMPTZ NOT NULL
);
```

**规则**：用户消息在 **PyAI 收到 chat/stream 时同步写 PG**（不再等 run 结束 MQ）。

#### `agent_run`

```sql
CREATE TABLE agent_run (
  id                  VARCHAR(64) PRIMARY KEY,
  session_id          VARCHAR(64) NOT NULL,
  user_id             BIGINT NOT NULL,
  user_message_id     VARCHAR(64) NOT NULL,
  assistant_message_id VARCHAR(64),
  status              VARCHAR(32) NOT NULL,
  -- 状态机见 4.2
  mode                VARCHAR(32),
  error_message       TEXT,
  worker_id           VARCHAR(64),      -- 最后处理的 python worker 实例
  lease_expires_at    TIMESTAMPTZ,      -- 分布式租约，防双跑
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL,
  updated_at          TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_agent_run_session ON agent_run(session_id, created_at DESC);
CREATE INDEX idx_agent_run_status ON agent_run(status) WHERE status IN ('queued','running','waiting_user');
```

#### `agent_run_checkpoint`

Python 无状态续跑所需快照（**不**存完整 transcript，仅存指针 + patch）：

```sql
CREATE TABLE agent_run_checkpoint (
  run_id          VARCHAR(64) PRIMARY KEY REFERENCES agent_run(id),
  step_index      INT NOT NULL,
  last_action     VARCHAR(32),
  context_patch   JSONB NOT NULL DEFAULT '{}',
  transcript_ref  VARCHAR(128),   -- 可选：对象存储 key 或 redis 短期 key
  version         INT NOT NULL DEFAULT 1,
  updated_at      TIMESTAMPTZ NOT NULL
);
```

#### `agent_event`

```sql
CREATE TABLE agent_event (
  id              VARCHAR(64) PRIMARY KEY,
  run_id          VARCHAR(64) NOT NULL,
  session_id      VARCHAR(64) NOT NULL,
  sequence        INT NOT NULL,
  event_type      VARCHAR(64) NOT NULL,
  source          VARCHAR(32) NOT NULL,
  payload         JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL,
  UNIQUE (run_id, sequence)
);
CREATE INDEX idx_agent_event_run ON agent_event(run_id, sequence);
```

#### `agent_run_command`（interaction 幂等）

```sql
CREATE TABLE agent_run_command (
  id              VARCHAR(64) PRIMARY KEY,  -- command_id from client
  run_id          VARCHAR(64) NOT NULL,
  command_type    VARCHAR(32) NOT NULL,     -- interaction.submit | run.abort | ...
  payload         JSONB NOT NULL,
  status          VARCHAR(32) NOT NULL,     -- accepted | applied | rejected
  created_at      TIMESTAMPTZ NOT NULL,
  UNIQUE (run_id, id)
);
```

#### `agent_context_snapshot`

与 2026-05-27 设计一致，`payload JSONB`。

### 4.2 Run 状态机

```text
                    ┌─────────┐
                    │ QUEUED  │◄── 创建 run + user_message
                    └────┬────┘
                         │ worker 领取（lease）
                         ▼
                    ┌─────────┐
              ┌────►│ RUNNING │────┐
              │     └────┬────┘    │
              │          │         │
              │   AskUser/choose   │ 正常结束
              │          ▼         ▼
              │   ┌──────────────┐  ┌───────────┐
              └───│ WAITING_USER │  │ COMPLETED │
                  └──────┬───────┘  └───────────┘
                         │ command applied + resume job
                         └──────────► RUNNING

  任意态 ──abort──► ABORTED
  任意态 ──error──► FAILED
  RUNNING 租约超时 ──► QUEUED（可重试）
```

**合法迁移**由 `AgentRunStateMachine`（Content 或 common 模块）单点校验。

### 4.3 Redis 角色（保留但收缩）

| 用途 | Key | TTL |
|------|-----|-----|
| Live SSE fanout | `run:live:{runId}` pub/sub | run 生命周期 |
| 短期 transcript 缓冲 | `run:transcript:{runId}` | 24h |
| Refresh token | `auth:refresh:{id}` | 30d |
| 设备会话 | `auth:device:{sid}` | 30d |
| 防重放 nonce | `auth:nonce:{sid}:{nonce}` | 5min |
| AES 密钥缓存 | `auth:aeskey:{kid}` | 24h |
| 权限缓存 | `user:permissions:{userId}` | 可选 |

**不再**用 Redis 存 chat session 主数据（迁移后）。

---

## 5. RabbitMQ 拓扑

### 5.1 新增 Topic（`MqTopic` 枚举扩展）

| Topic | Routing Key | 生产者 | 消费者 | 说明 |
|-------|-------------|--------|--------|------|
| `AGENT_RUN_DISPATCH` | `run.dispatch` | PyAI | Python Worker | 新 run 或 resume |
| `AGENT_RUN_EVENTS` | `run.events` | Python Worker | Consumer → Content PG + Redis pub | 事件双写 |
| `AGENT_RUN_COMMAND` | `run.command` | PyAI (WS) | Content 写 command 表 + 转发 dispatch | 幂等 |

保留：`AGENT_SESSION` 在 PG 落地后可 **废弃**（turn 文本已由 message 表承担）。

### 5.2 Dispatch 消息体

```json
{
  "job_id": "job_xxx",
  "run_id": "run_xxx",
  "action": "start | resume",
  "command_id": "cmd_xxx",
  "lease_owner": "worker-hostname",
  "attempt": 1
}
```

### 5.3 Worker 执行模型

1. Consumer 收到 `run.dispatch`（prefetch=1，按 run_id 哈希单队列或可配置并发）。
2. `POST /internal/agent/runs/{runId}/lease` 抢租约（Content CAS `status + lease_expires_at`）。
3. 加载 checkpoint + context_snapshot + 最近 events。
4. 执行 Python `query_loop` **一个 slice**：
   - 跑到 `wait_for=interaction` → 写 status=`WAITING_USER`，checkpoint，发 `run.waiting` event，**退出**
   - 跑到 step 结束且 continue → 更新 checkpoint，**再次** publish dispatch（或同 worker 循环，直到 wait/complete）
   - 完成 → `COMPLETED`，释放租约
5. 每个 event：`publish AGENT_RUN_EVENTS` → Consumer append `agent_event` + Redis pub。

**关键**：同一 `run_id` 在任意时刻只有一个 lease holder（Content DB 乐观锁）。

---

## 6. PyAI / 前端交互变更

### 6.1 启动 Run

```text
POST /api/agent/chat/stream
  → Content: create session/message/run (QUEUED)
  → MQ: run.dispatch
  → PyAI: SSE 订阅 Redis run:live:{runId}
  → 前端收到 agent-event（与现协议兼容）
```

### 6.2 AskUser / Interaction

```text
WS interaction.submit { command_id, payload }
  → PyAI → Content: insert agent_run_command (idempotent)
  → MQ: run.command + run.dispatch(resume)
  → Worker 续跑
  → events → SSE
```

### 6.3 断线恢复

```text
Status WS 连接
  → Content: GET run by session (status=RUNNING|WAITING_USER)
  → GET /runs/{id}/events?after_sequence=N
  → 若仍 RUNNING，订阅 Redis live
```

Host 模式 journal **删除**，由 PG events + live pub 替代。

### 6.4 前端

- 401 → refresh token → 重试
- Run 进行中刷新页面 → 调 `GET /api/agent/sessions/{id}/active-run` 恢复 UI
- AskUser 表单提交带 `command_id`（UUID）

---

## 7. Python 改造要点

| 现模块 | 改造 |
|--------|------|
| `run_session.py` | **删除**；改为 Content API `GET run status` + command 表 |
| `query_loop.py` | 支持 **slice 模式**：传入 checkpoint，返回 `{next_status, checkpoint, events[]}` |
| `router.py` `/run/stream` | 保留兼容期；新增 **internal** `/worker/run/execute` 供 job 调用 |
| 部署 | `python-ai-worker` 镜像：只消费 MQ，不暴露 8000；或同镜像不同 `ROLE=worker` |

Worker **不**依赖内存 `_sessions` dict。

---

## 8. 分阶段实施（建议 4 个 PR 波次）

### Phase 0：JWT + Cookie + 客户端安全层（2–3 周）

**0a — 身份底座**

- `agent-common-security` 模块（AES-GCM、nonce、指纹匹配）
- auth：JWT 签发/refresh/logout；HttpOnly Cookie（`na_rt`, `na_sess`, `na_csrf`）
- gateway：`JwtAuthWebFilter`；删除 sa-token
- frontend：`sessionStore`（内存 JWT）、`secureFetch` 骨架；去掉 localStorage token

**0b — 指纹 + 环境 + 心跳**

- frontend：`fingerprint.ts`, `envCollect.ts`, `HeartbeatWorker`
- auth：`POST /heartbeat`；Redis `auth:device:{sid}`；PG `auth_device_session`, `auth_env_log`
- gateway：`FingerprintWebFilter`, `HeartbeatWebFilter`（可先 warn 不 block）

**0c — AES 请求加密**

- frontend：`requestCrypto.ts` 包装 API body + 敏感 field
- gateway：`RequestDecryptWebFilter`, `ReplayGuardWebFilter`, `CsrfWebFilter`
- feature flag 分步：`aes-required` 最后开启

**0d — WebSocket 票据**

- `POST /api/auth/ws-ticket`；前端 WS 用一次性 ticket

**可独立上线**；`client-security.enabled=false` 时与旧客户端兼容。

### Phase 1：PG 表 + Content API（Run + Chat session）（1–2 周）

- 建表、Entity、Repository
- `AgentRunService` 状态机 + lease
- Internal API（service key）
- 双写：Redis session **与** PG 并行（读 PG 优先开关）

### Phase 2：事件管道 + 历史查询（1 周）

- `AGENT_RUN_EVENTS` consumer 落库
- `GET /runs/{id}/events`、`/timeline`
- PyAI SSE 改订阅 Redis pub（事件仍可由旧 Python stream 产生，先双轨）

### Phase 3：队列 + 无状态 Worker（2–3 周）

- Dispatch/Command 队列
- Python slice 执行 + checkpoint
- 下线 `RunSession`、`AgentRunRegistry`、内存 journal
- 下线 `AGENT_SESSION` MQ（turn 写 PG message）
- 编排固定单 Worker 池；`python-ai-2` 纳入 worker 消费组

### Phase 4：Redis session 退役（1 周）

- 迁移脚本 Redis → PG
- 删除 `ContentSessionService` Redis 实现

---

## 9. 风险与对策

| 风险 | 对策 |
|------|------|
| checkpoint 过大 | transcript 放 Redis/S3，PG 只存 ref |
| 租约误杀长 LLM | lease TTL 15min，worker 心跳续租 |
| MQ 丢消息 | 持久化队列 + DLQ + run status 对账 job |
| 迁移期双轨复杂 | Feature flag：`agent.runtime.mode=legacy|queued` |
| JWT secret 泄露 | 仅 MW 持 secret；后续可升 RS256 |
| AES 误杀/CPU | stream 默认不加密；指纹容忍度可配；设备重验证页 |
| env 采集合规 | 隐私政策 + 登录页告知；最小必要字段 |

---

## 10. 验收标准

1. AskUser 提交后 5s 内 run 从 `WAITING_USER` → `RUNNING`（同 run_id）。
2. PyAI/Python 任意单实例重启，进行中的 run 可被 worker 重新 lease 并续跑。
3. `GET /runs/{id}/events` 与实时 SSE 顺序一致（sequence 单调）。
4. 登录/logout/refresh 走 Cookie + JWT；无 sa-token；WS 用 ws-ticket。
5. 2 个 Python Worker 并发处理 **不同** run_id，互不干扰。
6. 未带 AES/心跳的请求在 `client-security.enabled=true` 时返回 401/403。
7. 心跳中断 >3min 后 API 拒绝，refresh 或 re-login 可恢复。

---

## 11. 待你确认

1. **Cookie 域**：生产用 `.novel-agent.cn` 是否 OK？本地 dev 用 `localhost` 无 Secure。
2. **心跳间隔**：默认 60s、超时 180s 是否合适？
3. **AES 范围**：除 login/health 外 **全部 REST** 加密；**SSE stream 默认不加密** — 是否同意？
4. **指纹误杀**：403 时走「短信/邮箱二次验证」还是「强制重新登录」？
5. **Run + Chat**：session 一并迁 PG；Phase 0 完成后 Phase 1 开 Run 状态机 — 顺序是否 OK？

确认后写入 `docs/superpowers/plans/2026-06-04-run-statemachine-jwt-auth.md` 并从 Phase 0a 开干。
