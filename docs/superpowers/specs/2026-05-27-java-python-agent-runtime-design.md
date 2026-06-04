# Java-Python Agent Runtime Streaming Design

## Summary
本设计定义小说写作 Agent 的实时通信、上下文注入、事件追踪和持久化方案。系统采用 `前端 -> Java -> Python` 的链路：前端只连接 Java；Java 负责认证、业务上下文聚合、SSE 透传与 PostgreSQL 持久化；Python 负责 Agent Runtime 执行、标准事件生成以及工具、技能和 MCP 调用编排。

目标是打通以下能力：

- 前端实时追踪 `think / message / tool / skill / mcp / persist` 全链路事件
- Java 统一认证、上下文组装和请求转发
- Python 以标准事件协议输出执行过程
- Java 通过 RabbitMQ 异步持久化运行事件到 PostgreSQL
- 系统支持历史回放、审计和问题定位

## Goals

- 前端不再直连 Python，统一从 Java 获取实时 SSE
- Java 在调用 Python 前完成用户鉴权和业务上下文注入
- Python 将执行过程统一建模为标准事件流
- Java 对 Python 事件做透明代理，并异步持久化
- PostgreSQL 成为运行历史、消息、上下文快照和事件时间线的主存储
- RabbitMQ 用于解耦实时流输出与持久化写入

## Non-Goals

- 本阶段不将 Cursor 会话中的 Skill 或 MCP 能力桥接到项目中
- 本阶段不实现 WebSocket 双向控制，实时链路保持 SSE
- 本阶段不引入 Kafka，事件量级优先使用 RabbitMQ
- 本阶段不让 Python 直接写业务 PostgreSQL
- 本阶段不实现复杂的分布式补偿平台，只提供 DLQ 和基础重试

## Current State

当前项目存在以下现状：

- 前端 `EditorPage` 直接请求 Python `/api/agent/chat/stream`
- Python 当前仅输出少量 SSE 事件：`tool`、`think`、普通文本和 `end/error`
- Java 后端已经有认证、网关和 MQ 基础设施，但还未承接 Agent 实时流入口
- Python 没有独立的 Runtime、事件模型或持久化层
- 前端当前以消息内容拼接方式追踪状态，缺少稳定的事件模型

## Target Architecture

### High-Level Flow

1. 前端调用 Java `agent chat stream` 接口
2. Java 校验登录态、权限和资源归属
3. Java 创建 `session`、`message` 和 `run`
4. Java 从 PostgreSQL / Redis / 业务表组装结构化上下文
5. Java 调用 Python Runtime 流式接口
6. Python 在执行过程中持续输出标准事件
7. Java 将事件原样透传给前端
8. Java 将需要持久化的事件投递到 RabbitMQ
9. Java 异步消费者写入 PostgreSQL
10. 前端按事件时间线实时更新 UI，历史数据统一从 Java 查询

### Responsibility Boundaries

#### Frontend

- 只连接 Java，不直连 Python
- 只消费标准事件，不解析文本前缀猜状态
- 按 `run + event + step` 模型驱动实时 UI
- 从 Java 历史接口恢复会话和运行时间线

#### Java

- 负责认证、鉴权和资源访问控制
- 负责会话、消息、运行记录和事件持久化
- 负责组装并裁剪传给 Python 的执行上下文
- 负责作为 SSE 主出口代理 Python 事件
- 负责将可持久化事件投递到 RabbitMQ
- 负责提供历史查询和回放接口

#### Python

- 负责 Agent Runtime 执行
- 负责 Tool、Skill、MCP 的执行编排
- 负责按统一协议输出执行事件
- 不负责认证、业务主存储和用户上下文聚合
- 不直接写 PostgreSQL 主业务库

## Request and Streaming Lifecycle

### Java Entry

前端调用 `POST /api/agent/chat/stream`，请求进入 Java。Java 完成以下动作：

1. 解析用户身份和业务目标（项目、章节、会话）
2. 校验用户对目标资源是否有读写权限
3. 创建或复用 `agent_session`
4. 写入本次 `agent_message` 的用户消息
5. 创建 `agent_run`
6. 组装 `AgentInvokeRequest`
7. 调用 Python 流式接口并开始转发

### Java -> Python Request Shape

Java 发往 Python 的请求体固定为结构化对象：

```json
{
  "run_id": "run_xxx",
  "session_id": "sess_xxx",
  "message_id": "msg_xxx",
  "user": {
    "id": 123,
    "roles": ["writer"]
  },
  "input": {
    "message": "帮我续写这一章",
    "mode": "continue"
  },
  "context": {
    "project": {
      "id": 1,
      "title": "我的小说"
    },
    "chapter": {
      "id": 10,
      "title": "第三章",
      "content": "..."
    },
    "recent_messages": [],
    "characters": [],
    "worldbook": [],
    "outline": {},
    "preferences": {
      "style": "悬疑"
    }
  },
  "trace": {
    "emit_think": true,
    "emit_tool": true,
    "emit_skill": true,
    "emit_mcp": true
  }
}
```

Java 在发起调用前，必须同时将完整上下文快照落入 `agent_context_snapshot`，用于后续排查和回放。

### Python Runtime Flow

Python 运行时执行步骤如下：

1. 建立本次运行的 `RunContext`
2. 发出 `run.started`
3. 发出 `message.started`
4. 生成并发出可展示的 `think` 事件
5. 按计划执行 `skill`，并在 skill 内调用 `tool` 和 `mcp`
6. 生成用户可见正文，发出 `message.delta`
7. 在运行结束时发出 `message.completed` 和 `run.completed`
8. 若中途失败，发出对应的 `tool.failed`、`skill.failed`、`mcp.failed` 或 `run.failed`

### Java Stream Proxying

Java 对 Python 返回的事件做透明代理，遵守以下规则：

- 不重写 Python 事件语义
- 允许在事件外层补充业务关联字段
- 对持久化相关事件做补充标记
- 统一以 Java SSE 出口返回给前端

Java 透传为主，Python 是事件协议的权威定义方，避免双端协议漂移。

## Event Protocol

### SSE Contract

- SSE 主事件名：`agent-event`
- 心跳事件名：`heartbeat`
- 流结束事件名：`stream-end`
- `agent-event` 的 `data` 为 JSON 对象

### Event Envelope

每条业务事件都使用如下统一结构：

```json
{
  "event_id": "evt_01...",
  "run_id": "run_01...",
  "session_id": "sess_01...",
  "message_id": "msg_01...",
  "step_id": "step_01...",
  "parent_step_id": "step_00...",
  "sequence": 27,
  "timestamp": "2026-05-27T09:49:00.123Z",
  "type": "tool.started",
  "source": "runtime",
  "persist": true,
  "payload": {}
}
```

### Field Semantics

- `event_id`: 全局唯一事件 ID
- `run_id`: 一次 Agent 执行链路 ID
- `session_id`: 会话 ID
- `message_id`: 当前消息 ID
- `step_id`: 当前步骤 ID
- `parent_step_id`: 父步骤 ID，用于树状展示
- `sequence`: 当前运行内严格递增序号
- `timestamp`: 事件产生时间
- `type`: 事件类型
- `source`: 事件来源，常见值包括 `runtime`、`java.gateway`、`persistence`
- `persist`: 是否进入持久化流程
- `payload`: 与具体事件类型相关的结构化数据

### Event Types

第一阶段固定支持以下事件类型：

- `run.started`
- `run.completed`
- `run.failed`
- `message.started`
- `message.delta`
- `message.completed`
- `think.started`
- `think.delta`
- `think.completed`
- `tool.started`
- `tool.completed`
- `tool.failed`
- `skill.started`
- `skill.completed`
- `skill.failed`
- `mcp.started`
- `mcp.completed`
- `mcp.failed`
- `persist.enqueued`
- `persist.completed`
- `persist.failed`

### Payload Examples

`think.delta`

```json
{
  "text": "我先分析用户希望续写的方向。"
}
```

`message.delta`

```json
{
  "text": "雨越下越大，他却没有离开。"
}
```

`tool.started`

```json
{
  "name": "search_world_context",
  "display_name": "检索世界观",
  "input": {
    "query": "主角背景"
  }
}
```

`tool.completed`

```json
{
  "name": "search_world_context",
  "output": {
    "hits": 3,
    "summary": "找到 3 条相关设定"
  },
  "duration_ms": 182
}
```

`skill.started`

```json
{
  "name": "outline-expansion",
  "display_name": "大纲扩写",
  "input": {
    "chapter": 2
  }
}
```

`mcp.started`

```json
{
  "server": "world-store",
  "tool": "search_memory",
  "input": {
    "keyword": "银月城"
  }
}
```

`persist.enqueued`

```json
{
  "target": "postgres",
  "queue": "agent.events.persist",
  "event_ref": "evt_01..."
}
```

## Runtime Modeling in Python

### Runtime Layers

Python 端新增运行时分层：

- `Route Layer`: 接收 Java 调用，创建运行上下文并返回事件流
- `RunContext`: 保存 `run_id / session_id / message_id / sequence / step stack`
- `EventEmitter`: 运行时唯一事件出口
- `ExecutionEngine`: 负责执行 Agent 规划、Skill 编排、Tool 和 MCP 调用
- `Registry`: 负责查找 Tool、Skill 和 MCP Adapter

### Tool, Skill and MCP Boundaries

#### Tool

- 本地即时能力
- 以单函数或短异步任务为主
- 输出结构化结果

#### Skill

- 为实现某个明确目标的一段组合流程
- 可以包含多个 Tool 与 MCP 调用
- 是前端时间线中的父级步骤节点

#### MCP

- 面向外部能力的统一适配层
- 接口固定为 `server / tool / input / timeout / result / error`
- 前端不关心底层协议细节

### Displayable Thinking

`think.*` 事件只能输出可展示的分析摘要，不能直接暴露模型的原始隐藏推理。思考事件属于运行可观测性信息，不等价于底层模型的完整 Chain-of-Thought。

## Java Service Design

### Java Components

Java 侧新增以下核心组件：

- `AgentStreamController`: 前端实时 SSE 入口
- `AgentGatewayService`: 鉴权、上下文组装、Python 调用和事件透传主编排
- `AgentContextAssembler`: 从业务存储组装传给 Python 的结构化上下文
- `PythonAgentClient`: 基于 `WebClient` 调 Python 流式接口
- `AgentEventParser`: 解析 Python 返回的标准事件
- `AgentEventPublisher`: 将事件投递到 RabbitMQ
- `AgentPersistenceConsumer`: 异步消费持久化队列并写 PostgreSQL
- `AgentHistoryQueryService`: 提供会话、运行和事件查询接口

### Java Query APIs

Java 需要提供以下历史查询接口：

- `GET /api/agent/sessions/{sessionId}`
- `GET /api/agent/runs/{runId}`
- `GET /api/agent/runs/{runId}/events`
- `GET /api/agent/runs/{runId}/timeline`

## PostgreSQL Schema

### agent_session

用于表示聊天线程。

字段：

- `id`
- `user_id`
- `project_id`
- `chapter_id`
- `title`
- `status`
- `created_at`
- `updated_at`

### agent_message

用于保存用户消息和聚合后的助手消息。

字段：

- `id`
- `session_id`
- `run_id`
- `role`
- `content`
- `status`
- `created_at`

约束：

- 用户消息在 Java 接收请求时写入
- 助手消息在运行结束后回填最终正文

### agent_run

用于表示一次执行链路。

字段：

- `id`
- `session_id`
- `user_message_id`
- `assistant_message_id`
- `user_id`
- `status`
- `python_request_id`
- `started_at`
- `completed_at`
- `error_message`

### agent_event

append-only 事件时间线表。

字段：

- `id`
- `run_id`
- `session_id`
- `message_id`
- `step_id`
- `parent_step_id`
- `sequence`
- `event_type`
- `source`
- `persist_status`
- `payload` (`jsonb`)
- `created_at`

索引：

- `(run_id, sequence)`
- `(session_id, created_at)`
- `(event_type, created_at)`

### agent_context_snapshot

用于保存传给 Python 的上下文快照。

字段：

- `id`
- `run_id`
- `user_id`
- `context_version`
- `payload` (`jsonb`)
- `created_at`

## RabbitMQ Topology

### Exchange and Queues

- Exchange: `agent.events`
- Queue: `agent.events.persist`
- Queue: `agent.events.persist.dlq`
- Exchange: `agent.events.status`
- Queue: `agent.events.status.gateway`

### Publishing Rules

- Java 收到可持久化事件后，立即透传给前端
- Java 同步投递该事件到 `agent.events.persist`
- Java 同时可向前端发出 `persist.enqueued`
- `AgentPersistenceConsumer` 在写入 PostgreSQL 完成后，将结果发布到 `agent.events.status`
- Java 网关订阅与当前 `run_id` 对应的状态消息，在连接仍存活时向前端追加 `persist.completed` 或 `persist.failed`

### Consumer Rules

- `AgentPersistenceConsumer` 消费 `agent.events.persist`
- 成功写入 PostgreSQL 后，发布一条状态消息到 `agent.events.status`
- 写入失败时执行有限重试
- 超过重试阈值后进入 `agent.events.persist.dlq`

### Source of Truth

事件持久化的最终真相以 PostgreSQL 为准。实时 SSE 用于降低用户等待感知，但不作为唯一历史来源。

## Frontend State Model

### Store Shape

前端状态改为以运行和事件为核心，而不是以聊天气泡临时拼装：

- `sessions`: 会话列表与当前会话
- `runs`: 当前运行和历史运行摘要
- `events`: 当前运行的事件时间线
- `steps`: 以 `step_id` 为索引的步骤状态树

### UI Projection

前端至少拆成四个独立区域：

- 正文区：消费 `message.*`
- 思考区：消费 `think.*`
- 执行追踪区：消费 `tool.* / skill.* / mcp.*`
- 持久化状态区：消费 `persist.*`

### Event Consumption Rules

- 前端只依赖 `type`
- 所有事件按 `sequence` 排序
- 相同 `step_id` 的 `started/completed/failed` 合并为同一节点
- `parent_step_id` 决定层级关系
- 页面刷新后优先走历史接口恢复，再接实时 SSE

## Failure Handling

### Java Failures

- 未登录或无权限：直接拒绝请求，不创建运行
- 上下文组装失败：创建失败态运行并返回 `run.failed`
- Java 调 Python 失败：返回 `run.failed`，`source=java.gateway`

### Python Failures

- `tool` 失败：发 `tool.failed`，由 Skill 或 Runtime 决定是否继续
- `skill` 失败：发 `skill.failed`，通常向上冒泡到 `run.failed`
- `mcp` 失败：发 `mcp.failed`，允许局部重试

### Persistence Failures

- MQ 投递失败：不阻塞前端流，但必须发 `persist.failed`
- PostgreSQL 写失败：消费者重试，超阈值进入 DLQ
- 历史恢复不完整：前端显式标记归档不完整

## Implementation Phases

### Phase 1: Event Protocol and Frontend Consumption

- Python 输出统一事件协议
- Java 先做最小透传
- 前端改为按事件模型渲染

完成标准：

- 前端能实时展示 `think/tool/skill/mcp/message`
- 不再通过正文前缀区分思考

### Phase 2: Java Proxy and Context Injection

- Java 提供 `/api/agent/chat/stream`
- Java 创建会话、消息和运行
- Java 组装上下文并调用 Python

完成标准：

- 前端只访问 Java
- Python 可接收到结构化上下文

### Phase 3: RabbitMQ and PostgreSQL Persistence

- Java 投递可持久化事件到 RabbitMQ
- 消费者异步写入 PostgreSQL
- 保存上下文快照和事件时间线

完成标准：

- 一次运行结束后可以从 PostgreSQL 回放事件
- 持久化失败不阻塞实时流

### Phase 4: History Replay and Operations

- Java 增加历史查询接口
- 前端支持历史回放
- 补充 DLQ 观测与失败重试

完成标准：

- 页面刷新后可恢复运行历史
- 运维可以定位执行失败位置

## Testing Strategy

### Python Tests

- 事件顺序与 `sequence` 单调性
- `step_id / parent_step_id` 关系正确性
- `tool / skill / mcp` 失败事件完整性

### Java Tests

- 鉴权与资源访问控制
- 上下文组装正确性
- Python 流代理行为
- MQ 异常时的降级行为

### Frontend Tests

- SSE 事件到 UI 状态映射
- 历史恢复逻辑
- 局部失败展示
- 长文本流式渲染性能

## Final Decisions

以下决策在本设计中固定：

- 前端只连接 Java
- Java 负责认证、上下文和持久化
- Python 负责执行与事件输出
- Java 透明代理 Python 事件，不重新定义协议
- PostgreSQL 为主存储
- RabbitMQ 为异步持久化队列
- SSE 为实时链路
- 事件建模以 `run + event + step` 为核心

## Acceptance Criteria

当以下条件全部成立时，认为本设计落地成功：

- 登录用户可以通过 Java 发起 Agent 实时对话
- Java 能基于项目、章节和历史消息注入上下文
- Python 能连续输出标准事件流
- 前端能实时展示思考、正文、工具、技能、MCP 和持久化状态
- Java 能异步将事件写入 PostgreSQL
- 刷新页面后可以从 Java 查询并回放历史运行
