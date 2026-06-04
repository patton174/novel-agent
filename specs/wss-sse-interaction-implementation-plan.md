# Novel Agent 双通道实时交互实施计划（WSS 控制面 + SSE 内容面）

## 1. 背景与目标

当前链路中，`auth/gateway` 已部署在服务器，`pyai/python-ai` 主要用于本地开发调试。现阶段核心痛点：

- 上下文记忆与注入不稳定，影响多轮创作连续性。
- 用户需要实时交互能力（选择写作方向、停止生成、继续追问），纯 SSE 难以优雅承载控制指令。
- 业务职责边界需要明确：记忆与持久化应归属 Java，不应放在 Python。

本计划目标是实现“可用级”实时交互系统：

- 前端与 Java 使用 **WSS 控制面**承载交互动作和状态事件。
- 前端继续通过 **SSE 内容面**接收高频文本增量，保证稳定与低改造成本。
- Java 与 Python 继续使用 SSE 转发，Python 仅负责生成，不承担会话记忆主职责。
- Java 通过 MQ 异步持久化会话，下一轮请求自动注入上下文。

---

## 2. 架构决策

### 2.1 通信分层

- **控制面（WSS）**：低频、高价值、双向交互
  - `send_message` / `choose_option` / `stop_run` / `regenerate`
  - `run_started` / `choices_ready` / `run_completed` / `run_failed`
- **内容面（SSE）**：高频、单向文本流
  - `message.delta` / `think.delta` / `tool.*` / `run.*`
- **服务间（Java -> Python）**：保持现有 SSE，降低改造风险

### 2.2 责任边界

- **Frontend**
  - 维护 `session_id`、连接状态、UI 状态机
  - 控制命令走 WSS，正文流走 SSE
- **Java（gateway/pyai 扩展层）**
  - 会话主控（Run 生命周期）
  - 上下文查询与注入（user + session 维度）
  - 异步持久化编排（MQ 事件）
  - SSE <-> WSS 事件聚合与转发
- **Python**
  - 接收结构化请求并生成流式事件
  - 不直接承担持久化

---

## 3. 详细实施范围

## 3.1 阶段 A：协议与数据模型统一（1-2 天）

### A.1 统一会话键

- 统一关键字段：`user_id` + `session_id` + `run_id` + `message_id`
- 保证 `session_id` 不在中间层被重置（尤其 pyai 转发层）

### A.2 WSS 控制协议（前后端统一）

客户端 -> 服务端：

- `send_message`
  - payload: `session_id`, `message`, `mode`, `context_ref?`
- `choose_option`
  - payload: `session_id`, `run_id`, `option_id`
- `stop_run`
  - payload: `session_id`, `run_id`
- `regenerate`
  - payload: `session_id`, `run_id?`, `strategy?`

服务端 -> 客户端：

- `ack`（命令受理）
- `run_started`
- `choices_ready`
- `run_state_changed`（running / paused / stopped / completed / failed）
- `run_completed`
- `run_failed`

### A.3 SSE 事件对齐

- 保持现有 `agent-event` 主线
- 增加字段约束：所有事件携带 `run_id + session_id + sequence`
- 增加事件来源标记 `source`（host_guard / tool / model）

验收标准：

- 文档化协议冻结（字段、必填、版本号）
- 前后端对同一 `run` 的事件可关联追踪

---

## 3.2 阶段 B：Java 上下文注入与异步持久化（3-5 天）

### B.1 Java 会话上下文查询

在接收 `send_message` 后：

1. 查询最近 N 轮历史（建议 12-24 轮，可配置）。
2. 查询章节正文/摘要（可按 project/chapter/session 关联）。
3. 组装 `context` 并注入给 Python：
   - `context.text`
   - `context.history`
   - `context.preferences`

### B.2 Java 异步持久化（MQ）

触发点：

- `run.started`: 记录运行元数据
- `message.completed` 或 `run.completed`: 投递持久化消息
- `run.failed`: 投递失败状态消息

MQ 消息建议字段：

- `event_type`, `user_id`, `session_id`, `run_id`, `message_id`
- `user_message`, `assistant_message`, `mode`
- `tokens_in/out?`, `latency_ms`, `status`, `error?`
- `created_at`

消费者处理：

- 幂等落库（`run_id` / `message_id` 去重）
- 失败重试与死信（DLQ）

### B.3 读写策略

- “写入异步、读取同步”
  - 写：通过 MQ 异步，不阻塞用户流式响应
  - 读：新请求到来时同步读取已持久化数据

验收标准：

- 断开 Python 后，历史仍可从 Java 持久层恢复
- 进程重启后多轮上下文不丢失

---

## 3.3 阶段 C：前端实时交互体验（2-3 天）

### C.1 前端连接管理

- 单会话单 WSS 连接（可重连）
- SSE 流按 `run_id` 订阅并与控制事件合并展示
- 断线策略：
  - WSS 断线：指数退避重连
  - SSE 断流：提示并允许“继续/重试”

### C.2 UI 状态机

状态建议：

- `idle` -> `running` -> `waiting_choice` -> `running` -> `completed`
- 异常分支：`failed` / `stopped`

交互动作：

- 选择方向后立即发送 `choose_option`
- 支持 “停止生成” 显式中断
- 支持 “重新生成” 保留同一 session 上下文

验收标准：

- 方向选择可在同一会话连续推进
- 停止/重试行为可预测，无重复输出或状态错乱

---

## 3.4 阶段 D：联调与稳定性加固（2-3 天）

### D.1 观测性

- 日志统一维度：`session_id`, `run_id`, `message_id`, `user_id`
- 关键指标：
  - 平均首 token 时间（TTFB）
  - 生成耗时
  - run 失败率
  - MQ 消费延迟/堆积

### D.2 容错

- WSS 命令幂等（同一个 `command_id` 不重复执行）
- `stop_run` 支持软中断与超时强制中断
- Python 超时/异常时，Java 输出结构化失败事件，并保证 run 收敛

### D.3 回归测试

- 登录后首次会话
- 多轮连续创作（>= 10 轮）
- 方向选择链路（choose -> choose_option -> write）
- 中断恢复（stop -> regenerate）
- 服务重启后历史注入

---

## 4. 数据与存储建议

建议新增/确认数据表：

- `agent_session`
  - `session_id`, `user_id`, `status`, `created_at`, `updated_at`
- `agent_message`
  - `message_id`, `session_id`, `run_id`, `role`, `content`, `mode`, `created_at`
- `agent_run`
  - `run_id`, `session_id`, `user_id`, `status`, `latency_ms`, `error`, `created_at`

索引建议：

- `(user_id, session_id, created_at desc)`
- `run_id unique`
- `message_id unique`

---

## 5. 风险与回滚

主要风险：

- WSS 与 SSE 双通道一致性（状态不同步）
- MQ 消费延迟导致“刚生成内容尚未入库”
- 控制指令并发（重复点击导致重复执行）

缓解措施：

- `command_id` 幂等键
- run 状态机严格校验（非法状态迁移拒绝）
- 写后读一致性兜底：若持久层暂无，短暂回读缓存

回滚策略：

- 功能开关 `FEATURE_WS_CONTROL`（默认灰度）
- 异常时退回“纯 SSE + 现有流程”
- 不影响 auth/gateway 主链路可用性

---

## 6. 里程碑与交付件

M1（协议冻结）：

- WSS/SSE 事件契约文档
- 前后端状态机草图

M2（后端可用）：

- Java 完成上下文注入 + MQ 持久化
- Python 接口保持兼容

M3（前端可用）：

- WSS 控制动作可用（发送/选择/停止/重试）
- SSE 内容稳定展示

M4（上线准备）：

- 压测报告
- 观测告警配置
- 回滚预案演练

---

## 7. 明确不做（本期）

- 不将 Python 改造成会话记忆主服务
- 不在本期实现 Java<->Python 全量 WSS（继续保留 SSE）
- 不在本期引入复杂协同编辑（多人同会话）

---

## 8. 配置项建议

Java：

- `agent.ws.enabled=true`
- `agent.memory.history-limit=24`
- `agent.mq.persist-topic=agent.session.persist`
- `agent.run.timeout-seconds=420`

Frontend：

- `VITE_WS_CONTROL_URL=ws://<gateway>/ws/agent/control`
- `VITE_SSE_STREAM_URL=/api/agent/chat/stream`

Python（保持轻量）：

- 仅保留生成超时、模型、trace 相关配置

