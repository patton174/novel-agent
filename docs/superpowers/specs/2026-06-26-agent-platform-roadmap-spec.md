# Agent 平台能力路线图 — 设计规格（书库 RAG · Skills · 多 Agent）

> **版本**：2026-06-26  
> **状态**：待评审  
> **配套计划（详细版）**：[`plans/2026-06-26-agent-platform-roadmap-index.md`](../plans/2026-06-26-agent-platform-roadmap-index.md)（T1–T78 全任务节点 + 14 分册）  
> **架构基线**：novel-studio 单体 + python-ai + frontend（`docs/ARCHITECTURE.md`）  
> **关联已有设计**：书库 RAG [`2026-06-19-library-design.md`](./2026-06-19-library-design.md)、Agent Runtime [`2026-05-27-java-python-agent-runtime-design.md`](./2026-05-27-java-python-agent-runtime-design.md)、知识图谱 [`2026-06-19-knowledge-graph-design.md`](./2026-06-19-knowledge-graph-design.md)

---

## 1. 背景与战略意图

小说写作 Agent 的差异化不在「能聊天」，而在 **可控的长程创作基础设施**：参考书库语义检索、可复用写作技能、可编排的专家 Agent 团。三者构成同一产品叙事：

| 能力柱 | 用户价值 | 产品话术 |
|--------|----------|----------|
| **书库引用 + RAG** | 风格/结构/设定有据可查，减少胡编 | 「像导演一样 @ 参考书，Agent 按需翻片段」 |
| **Skills** | 把编辑经验产品化（甜宠节奏、悬疑钩子、番茄封面构图…） | 「一键加载专家工作流，不是每次重讲规则」 |
| **多 Agent 协作** | 复杂任务拆分、并行、专责 QA | 「主编 + 写手 + 审校，而不是一个万能助手」 |

本规格定义 **2026 H2 重点开发的三条主线**、市场对标、现状差距、目标架构与分阶段交付边界。

### 1.1 成功标准（12 个月内）

| 模块 | 可验收结果 |
|------|------------|
| 书库 RAG | 用户 @ 参考书 → 摘要+目录进 context；`SearchKnowledge(scope=book:)` 返回可引用片段；索引状态可见、失败可重试 |
| Skills | 用户/Admin 可管理 Skill 目录；编辑器可选 Skill；Agent `Skill` 工具加载后行为可观测（SSE + 计费 token 归因） |
| 多 Agent | 主 Agent 可派发 ≥2 种角色子 Agent（写作/审校）；子 run 生命周期可追踪；专家团模板可保存复用；禁止无限嵌套 |

### 1.2 非目标（本路线图不做）

- 用户自建任意 Python 代码沙箱（仅 Skill 文本 + 工具白名单）
- 跨租户 Agent 市场抽成（P2 仅站内模板库）
- 实时 WebSocket 双向 Agent 控制（保持 SSE）
- 替换现有 Content API 工具面（章节/记忆仍走 novel-studio HTTP）
- Neo4j 独立图数据库（KG 继续 PG + 内存/抽取管线）

---

## 2. 市场调研（2025–2026）

### 2.1 竞品与模式对照

| 产品 / 项目 | 定位 | 书库 / RAG | Skills / 工作流 | 多 Agent | 可借鉴 |
|-------------|------|------------|-----------------|----------|--------|
| **Sudowrite** (Muse/Story Engine) | 商业网文助手 | 项目内 Bible + 章节上下文；弱外部 corpus | 场景化按钮（Expand/Rewrite）非开放 Skill | 单 Agent 为主 | 导演式 UI、风格采样 |
| **Novel AI** | 消费级生成 |  Lorebook 关键词触发（非向量 RAG） | Preset / Module 类似 Skill | 无 | Lorebook 触发语义清晰 |
| **NovelForge / novel-forge skill** | OpenClaw 长程小说 Skill | 外置 project state + canon 文件 | **SKILL.md 管线** + role→model 映射 | **sessions_spawn 多角色** | 状态外置、角色映射、阶段 gate |
| **Novel-OS** | 开源五 Agent 流水线 | JSON canon + continuity engine | 固定五角色（Architect/Scribe/Editor/Guardian/Curator） | **确定性编排 + LLM 校验** | 连续性引擎先于 LLM、结构化 state update |
| **Storywright MCP** | MCP 写书服务器 | 全书 bible + 章节检索预算 | 第三 pass Agent 可配置 | Writer→Editor→Third→Approve **状态机** | pipeline hint、严格 approve gate |
| **Novel Studio（同类 SaaS）** | 导演台 + Canon Store | **L0 精确 + L1 语义 RAG 分层** | Chat/Orchestrator/Worker 分工 | Orchestrator **代码状态机**（非 LLM 路由） | 编排层确定性、Canon 单一真相 |
| **Cursor / Claude Code** | 通用编码 Agent | Codebase index | **Agent Skills 开放格式**（SKILL.md） | Subagent + Task | Skill 包格式、MCP 扩展 |
| **LangGraph / CrewAI** | 框架 | 自带 vector store 集成 | 「Agent 定义 = prompt + tools」 | 显式 graph / crew | 生命周期事件、checkpoint |

### 2.2 市场结论（对本项目的启示）

1. **长篇一致性**：领先产品均把「Canon / 状态 / 连续性」放在 RAG 之上；纯向量检索 alone 不够，需 **结构化记忆（已有 Story Memory）+ 向量片段 + KG（已上线）** 三层融合。
2. **Skills 形态**：行业 converging 到 **可移植的 Markdown/YAML 技能包**（Cursor Agent Skills、novel-forge），而非硬编码 prompt 分支。
3. **多 Agent**：生产系统倾向 **确定性编排器（Java/代码）+ LLM Worker（Python）**，而非让 LLM 自由 spawn；子 Agent 深度、工具白名单、token 预算必须硬限制。
4. **参考书库**：网文作者强需求「仿风格/仿结构」，@ 参考书 + 按需 RAG 是差异化；Sudowrite 弱于此，我们有 **catalog + 私人上传 + Milvus** 基础可放大。

### 2.3 推荐产品定位句

> **Novel Agent = 带参考书库 RAG 的长程写作 Agent 平台 + 可安装 Skills + 可配置专家团编排。**

---

## 3. 现状盘点（codebase 2026-06）

### 3.1 书库内容引用 + RAG

| 项 | 状态 | 位置 |
|----|------|------|
| Milvus hybrid 检索 | ✅ 生产 | `python-ai/app/rag/hybrid_search.py` |
| `SearchKnowledge` + `scope=book:` | ✅ 已实现 | `python-ai/app/agent/tools/knowledge.py` |
| 公共书 `catalog:<id>` 索引 | ✅ worker | `CatalogIndexListener.java` |
| 私人书 `library:<uid>:<id>` 索引 | ⚠️ 设计完成，部分 Java/MQ 待落地 | `2026-06-19-library-design.md` |
| `referenced_books` 注入 | ⚠️ 前端+stream 已发；Java Assembler 需对齐 | `useEditorAgentStream.ts`, `AgentContextAssembler.java` |
| 聊天 @ 参考书 UI | ⚠️ 部分（`ChatComposer` chips） | 缺完整 picker/索引徽章 |
| 索引滞后提示 | ❌ | WriteChapter 后 SearchKnowledge 常 no_match |
| 书库摘要 LLM | ❌ | `/internal/library/summarize` 未落地 |

**差距摘要**：检索内核已有；**产品闭环**（@ 引用 → 注入 → 按需 RAG → 索引可观测）未完成。

### 3.2 Skills

| 项 | 状态 | 位置 |
|----|------|------|
| `Skill` 工具 | ✅ 读本地 `AGENT_SKILLS_DIR/*.md` | `python-ai/app/agent/tools/skill.py` |
| 注入 `skill_prompt` 到 context | ✅ context_patch | loop 需确认 merge 点 |
| 用户/Admin Skill CRUD | ❌ | 仅服务器目录 |
| 编辑器 Skill 选择器 | ❌ | |
| Skill SSE 事件 | ⚠️ runtime spec 预留 `emitSkill` | 前端 timeline 未一等公民 |
| 计费按 Skill 归因 | ❌ | |
| 与 Cursor Skills 格式兼容 | ⚠️ 部分（SKILL.md 路径） | 无 metadata/frontmatter 规范 |

**差距摘要**：**开发者工具级**实现，非 **平台产品级**（管理、分发、版本、UI）。

### 3.3 多 Agent 协作与生命周期

| 项 | 状态 | 位置 |
|----|------|------|
| `Agent` 子 Agent 工具 | ✅ 同步 nested query_loop | `subagent.py` |
| 最大深度 1、max turns 20 | ✅ 配置 | `config.py` |
| 子 Agent SSE 嵌套 UI | ✅ | `SubagentPanel`, `subagent_sse.py` |
| 自定义 Agent 定义（角色/工具/模型） | ❌ | 硬编码 subagent prompt |
| 专家团模板（多角色编排） | ❌ | |
| Agent 间消息/结果总线 | ❌ 仅 parent/child run_id | |
| Run 生命周期 API | ⚠️ Java run/session 有；子 run 查询弱 | |
| 并行多子 Agent | ❌ 串行 blocking | |
| Review/Narrative 专用子 Agent | ✅ 部分 | `review_agent.py` |

**差距摘要**：有 **单种子 Agent**；缺 **Agent 注册表、编排策略、并行、自定义专家团**。

---

## 4. 目标架构

### 4.1 总览

```
┌─────────────────────────────────────────────────────────────────┐
│ Frontend（编辑器）                                                │
│  @书库 picker · Skill 选择 · 专家团模板 · Agent 时间线/子 run    │
└────────────────────────────┬────────────────────────────────────┘
                             │ POST /api/agent/chat/stream
┌────────────────────────────▼────────────────────────────────────┐
│ novel-studio（Agent 模块）                                        │
│  AgentContextAssembler → referenced_books / skill_ids / crew_id │
│  RunRegistry（session/run/sub_run）· MQ 持久化 · 配额/审计        │
└────────────────────────────┬────────────────────────────────────┘
                             │ POST /internal/agent/run/stream
┌────────────────────────────▼────────────────────────────────────┐
│ python-ai                                                         │
│  query_loop · ToolRegistry · SkillLoader · CrewOrchestrator       │
│  RAG: hybrid_search · KG: get_character_graph                     │
│  SubAgentRunner（角色 profile + 工具白名单 + 预算）                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
          Milvus · PostgreSQL · Redis · RabbitMQ
```

### 4.2 模块 A：书库引用 + RAG（Corpus RAG）

**沿用** [`2026-06-19-library-design.md`](./2026-06-19-library-design.md) 架构，本路线图补充：

| 能力 | 说明 |
|------|------|
| **两段式检索** | ① Assembler 注入参考书摘要+章节目录（低 token）；② 模型 `SearchKnowledge(scope=book:<id>)` 拉片段 |
| **命名空间** | 私人 `library:<uid>:<catalogId>`；公共 `catalog:<id>`；当前小说 `<novelId>` |
| **索引 SLA** | `index_status` + 前端徽章；工具 no_match 时返回 `indexing` hint |
| **引用治理** | 仅 `user_library_collection` 内书可 @；Assembler 校验 owner |
| **与 KG 关系** | 参考书 KG 可选 P2；MVP 仅向量 RAG |

**API 摘要**（已有/待补全）：

- `GET /api/content/auth/catalog/my-library/selectable` — 可选参考书列表
- `POST /api/agent/chat/stream` — `referenced_books: [{ catalogNovelId }]`
- python `SearchKnowledgeInput.scope: "book:<catalogNovelId>" | null`

### 4.3 模块 B：Skills 平台

**目标**：从「服务器目录 Markdown」升级为 **用户可见、可版本、可组合** 的技能包。

#### 4.3.1 Skill 包格式（兼容 Cursor Agent Skills 子集）

```markdown
---
name: fanqie-chapter-hook
version: 1.0.0
description: 番茄短篇章末钩子写法
tools: [ReadChapter, WriteChapter, SearchKnowledge]
trigger: manual | auto_keywords
keywords: [钩子, 章末, 悬念]
locale: zh
---

# 章末钩子 Skill
（正文：注入 system 的 prompt 片段）
```

#### 4.3.2 存储与分发

| 层级 | 存储 | 可见性 |
|------|------|--------|
| 系统内置 | `python-ai/skills/bundled/` + DB seed | 全员 |
| 用户自定义 | PG `agent_skill`（user_id, content, version） | 仅本人 |
| 专家团引用 | `crew_template.skill_ids[]` | 随模板 |

#### 4.3.3 运行时

1. 前端选 Skill → `AgentStreamRequest.skill_ids[]`
2. Java Assembler 合并 skill 正文（或传 id 让 Python 拉取）
3. Python `Skill` 工具：支持 **按 id 从 API 加载** + 本地 bundled fallback
4. SSE：`skill.started` / `skill.loaded`（对齐 runtime spec）
5. 计费：skill_id 写入 `usage_event.meta`

#### 4.3.4 不做

- Skill 内嵌可执行代码
- 第三方 Skill 市场支付（P2 再议）

### 4.4 模块 C：多 Agent 协作与生命周期

#### 4.4.1 概念模型

| 概念 | 定义 |
|------|------|
| **Run** | 一次 Agent 执行实例（已有 `agent_run`） |
| **Sub-run** | 子 Agent 执行，`parent_run_id` + `role` |
| **Agent Profile** | 命名配置：system 模板、工具白名单、model、max_turns、temperature |
| **Crew Template（专家团）** | 有序/并行步骤：`[{ role, profile_id, prompt_template }]` |
| **Agent Mailbox** | 子 run 结构化结果回传父 run（JSON schema，非自由文本） |

#### 4.4.2 编排策略（确定性，在 Python `CrewOrchestrator` 或 Java 状态机）

```
用户消息 + optional crew_id
    → 若无 crew：主 Agent 正常 query_loop（可自主调用 Agent 工具）
    → 若有 crew：按模板阶段执行
         Stage 1: planner profile → 输出 structured plan
         Stage 2: writer profile (parallel x N 可选) → 章节草稿
         Stage 3: reviewer profile → PASS/WARN/FAIL
         Stage 4: 主 Agent 汇总 → 用户可见 delivery
```

**硬约束**（对齐 Novel-OS / Storywright 经验）：

- `max_depth=1` 保持；子 Agent **禁止** `Agent`/`AskUser`
- 子 Agent 工具集 = Profile 白名单 ∩ 全局注册表
- 每 sub-run **token/time budget**；超限 graceful degrade
- 子 run **blocking** 默认；P2 可选 async + 通知

#### 4.4.3 生命周期与可观测性

| 阶段 | 事件 | 存储 |
|------|------|------|
| created | `run.created` | PG `agent_run` |
| started | `run.started` | SSE + event log |
| tool/skill/sub-run | 嵌套 event | PG timeline |
| completed/failed/cancelled | `run.completed` | 更新 status；触发 quota |

**前端**：`GlobalAgentTracePanel` 展示 run 树；子 Agent 可折叠/跳转。

#### 4.4.4 内置 Agent Profile（MVP 种子）

| profile_id | 角色 | 工具白名单 |
|------------|------|------------|
| `main-editor` | 主编辑 | 全量（现默认） |
| `chapter-writer` | 章节写手 | Read/Write/List Chapter, Memory read, SearchKnowledge |
| `continuity-reviewer` |  continuity 审校 | Read*, SearchKnowledge, GetCharacterGraph, NarrativeReview |
| `style-editor` | 文风润色 | ReadChapter, EditChapter |

---

## 5. 跨模块依赖与数据流

```
书库 RAG ──referenced_books──► Assembler ──► RUN_CONTEXT.library 区块
                │
                └── SearchKnowledge(scope=book:) ──► Milvus

Skills ──skill_ids──► Assembler ──► skill_prompt 合并
                │
                └── Skill 工具（运行中按需 reload）

Crew ──crew_id──► Orchestrator ──► 多次 sub-run（各带 profile + skills）
                │
                └── sub-run 结果 ──► parent context_patch（catalog 刷新）
```

**关键原则**（来自 `AGENT_API_TOOLS_CONTEXT_ANALYSIS.md`）：

- WriteChapter / WriteMemory 后 **强制 catalog refresh**，子 Agent 结束亦同
- RAG 片段与 Story Memory snapshot **分工明确**，避免双 JSON 矛盾

---

## 6. 分阶段路线图

| 阶段 | 主题 | 交付 | 依赖 |
|------|------|------|------|
| **P0** | 书库 RAG 产品闭环 | 落地 library-design 剩余项；@picker；index 徽章；no_match hint | 模块5 书库 |
| **P1** | Skills MVP | bundled skills；DB 用户 Skill；编辑器选择；SSE skill 事件 | P0 可选并行 |
| **P2** | Agent Profile + 增强子 Agent | profile 表；子 Agent 按 profile 启动；UI run 树 | P1 部分 |
| **P3** | 专家团 Crew | crew 模板 CRUD；阶段编排；Review gate | P2 |

**建议执行顺序**：**P0 → P1 → P2 → P3**（P0 直接提升写作体验；Skills 与 RAG 解耦可部分并行）。

---

## 7. 风险与缓解

| 风险 | 缓解 |
|------|------|
| RAG 索引滞后 | `index_status` + 工具 hint + 可选 sync reindex API |
| Skill prompt 膨胀 context | Skill 摘要层 + 按需 Skill 工具加载；单 run skill 数量上限 |
| 多 Agent token 爆炸 | profile budget；Crew 阶段 max parallel=2；quota 预检 |
| 编排复杂度 | MVP 仅 sequential crew；并行 P3；编排逻辑 **Python 单测 + JSON fixture** |
| 与计费模型冲突 | sub-run usage 归 parent session；CRM 可展开子 run |

---

## 8. 验收清单（发布前）

### P0 书库 RAG
- [ ] 私人书上传 → 24h 内 `index_status=indexed`（或失败可重试）
- [ ] @ 参考书 → 消息 stream 带 `referenced_books` → system 可见书目区块
- [ ] `SearchKnowledge(scope=book:xxx)` 命中片段并带 chapter 标题
- [ ] 未索引书 @ 后 UI 显示「索引中」

### P1 Skills
- [ ] ≥3 个 bundled 写作 Skill 上线（钩子/甜宠节奏/悬疑开篇）
- [ ] 用户可保存自定义 Skill 并在下轮对话选用
- [ ] Timeline 可见 `skill.loaded`

### P2/P3 多 Agent
- [ ] 主 Agent 派发 `chapter-writer` sub-run，UI 树状展示
- [ ] 专家团模板一键选用，完成 planner→writer→reviewer 三阶段
- [ ] sub-run 失败不拖垮 parent（structured error + 用户可读摘要）

---

## 9. 文档与计划索引

| 文档 | 说明 |
|------|------|
| [plans/2026-06-26-agent-platform-roadmap-index.md](../plans/2026-06-26-agent-platform-roadmap-index.md) | **主索引**：T1–T78 任务总表 |
| [plans/2026-06-26-agent-platform-p0-rag-gaps.md](../plans/2026-06-26-agent-platform-p0-rag-gaps.md) | P0 补全 P0-G1–G8 |
| [plans/2026-06-19-library.md](../plans/2026-06-19-library.md) | P0 书库 RAG T1–T16（part1–4） |
| P1 Skills | [part1](../plans/2026-06-26-agent-platform-p1-part1-java-db.md) · [part2](../plans/2026-06-26-agent-platform-p1-part2-java-api.md) · [part3](../plans/2026-06-26-agent-platform-p1-part3-python.md) · [part4](../plans/2026-06-26-agent-platform-p1-part4-frontend.md) · [part5](../plans/2026-06-26-agent-platform-p1-part5-content.md) |
| P2 Profile | [part1](../plans/2026-06-26-agent-platform-p2-part1-java-db.md) · [part2](../plans/2026-06-26-agent-platform-p2-part2-java-api.md) · [part3](../plans/2026-06-26-agent-platform-p2-part3-python.md) · [part4](../plans/2026-06-26-agent-platform-p2-part4-frontend.md) |
| P3 Crew | [part1](../plans/2026-06-26-agent-platform-p3-part1-java.md) · [part2](../plans/2026-06-26-agent-platform-p3-part2-python.md) · [part3](../plans/2026-06-26-agent-platform-p3-part3-frontend.md) · [part4](../plans/2026-06-26-agent-platform-p3-part4-e2e.md) |
| [specs/2026-06-19-library-design.md](./2026-06-19-library-design.md) | P0 设计权威 |
| AGENTS.md / docs/AGENT_TOOLS.md | 工具与 SSE 命名同步更新 |

---

## 10. 待决策项（评审时确认）

1. **Skill 存储**：仅 PG text vs 对象存储 + PG 元数据？（建议 MVP PG text ≤32KB/skill）
2. **Crew 编排宿主**：Python 纯编排 vs Java 状态机 + Python worker？（建议 MVP Python `CrewOrchestrator`，Java 只传 `crew_id`）
3. **参考书 KG**：是否为参考书建 KG 抽取？（建议 P2+，MVP 仅 RAG）
4. **并行 sub-run**：P2 是否要做？（建议 P3，先 sequential 降低调试成本）
