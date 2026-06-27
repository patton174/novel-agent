# Agent 平台能力路线图 — 完整实施计划（主索引）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. 所有子计划任务使用 `- [ ]` checkbox 跟踪。
>
> **版本**：2026-06-26（详细版）  
> **设计规格**：[`specs/2026-06-26-agent-platform-roadmap-spec.md`](../specs/2026-06-26-agent-platform-roadmap-spec.md)  
> **预估总工期**：P0–P3 约 **14–20 人周**

---

## 分册导航

| 阶段 | 分册 | 任务范围 | 文件 |
|------|------|----------|------|
| **P0** | 书库 RAG（已有 + 补全） | T1–T16 + P0-G1–G8 | [library 主索引](./2026-06-19-library.md) + [P0 补全](./2026-06-26-agent-platform-p0-rag-gaps.md) |
| **P1** | Skills 平台 | T17–T38 | [P1-1 Java DB](./2026-06-26-agent-platform-p1-part1-java-db.md) · [P1-2 Java API+Assembler](./2026-06-26-agent-platform-p1-part2-java-api.md) · [P1-3 Python](./2026-06-26-agent-platform-p1-part3-python.md) · [P1-4 Frontend](./2026-06-26-agent-platform-p1-part4-frontend.md) · [P1-5 Content+Docs](./2026-06-26-agent-platform-p1-part5-content.md) |
| **P2** | Agent Profile | T39–T58 | [P2-1 Java DB](./2026-06-26-agent-platform-p2-part1-java-db.md) · [P2-2 Java API+RunTree](./2026-06-26-agent-platform-p2-part2-java-api.md) · [P2-3 Python SubAgent](./2026-06-26-agent-platform-p2-part3-python.md) · [P2-4 Frontend](./2026-06-26-agent-platform-p2-part4-frontend.md) |
| **P3** | 专家团 Crew | T59–T78 | [P3-1 Java DB+API](./2026-06-26-agent-platform-p3-part1-java.md) · [P3-2 Python Orchestrator](./2026-06-26-agent-platform-p3-part2-python.md) · [P3-3 Frontend](./2026-06-26-agent-platform-p3-part3-frontend.md) · [P3-4 Seed+E2E](./2026-06-26-agent-platform-p3-part4-e2e.md) |

---

## Goal

构建三大 Agent 平台能力柱：**书库引用 RAG**、**Skills 平台**、**多 Agent（Profile + Crew）**，形成可演示、可计费、可观测的长程写作基础设施。

## Architecture

```
Frontend → novel-studio Agent 模块（Assembler / CRUD / RunRegistry）
         → python-ai（query_loop / SkillLoader / SubAgentRunner / CrewOrchestrator）
         → Milvus + PostgreSQL + RabbitMQ
```

## Tech Stack

Java 21 / Spring Boot / JPA / Flyway / RabbitMQ / RestClient；python-ai FastAPI / pydantic / pytest；frontend React+TS / vitest / secureFetch。

---

## 全局任务编号总表

### P0 — 书库 RAG（T1–T16，详见 library 分册）

| ID | 任务 | 分册 | 状态 |
|----|------|------|------|
| T1 | V22 迁移 + index_status/index_namespace | library-part1 | ✅ 已落地 |
| T2 | CatalogService getReferencedBook 等 | library-part1 | ✅ |
| T3 | InternalCatalogController summary | library-part1 | ✅ |
| T4 | MqTopic.LIBRARY_INDEX + Message | library-part1 | ✅ |
| T5 | LibraryIndexListener | library-part1 | ✅ |
| T6 | AgentStreamRequest + ContextDto referenced_books | library-part2 | ✅ |
| T7 | AgentContextAssembler 注入 | library-part2 | ✅ |
| T8 | /my-library/selectable | library-part2 | ✅ |
| T9 | AgentRunContext referenced_books | library-part3 | ✅ |
| T10 | /internal/library/summarize | library-part3 | ✅ |
| T11 | SearchKnowledge scope=book: | library-part3 | ✅ |
| T12 | run_context library 区块 | library-part3 | ✅ |
| T13 | libraryApi + types | library-part4 | ✅ |
| T14 | ReferenceBookPicker | library-part4 | ✅ |
| T15 | ChatComposer + stream 发送 | library-part4 | ✅ |
| T16 | MyLibraryPage 索引徽章 + i18n | library-part4 | ⚠️ 部分 |
| **P0-G1** | SearchKnowledge indexing hint | p0-gaps | ❌ |
| **P0-G2** | index_status 枚举统一 | p0-gaps | ❌ |
| **P0-G3** | MyLibraryPage 完整徽章 | p0-gaps | ❌ |
| **P0-G4** | Feature flag VITE_FEATURE_LIBRARY_REF | p0-gaps | ❌ |
| **P0-G5** | E2E pytest + 手工清单 | p0-gaps | ❌ |
| **P0-G6** | AGENT_TOOLS.md 同步 | p0-gaps | ❌ |
| **P0-G7** | 索引失败重试 Admin 操作 | p0-gaps | ❌ |
| **P0-G8** | referenced_books token 预算截断 | p0-gaps | ❌ |

### P1 — Skills（T17–T38）

| ID | 任务 | 分册 |
|----|------|------|
| T17 | V26 迁移 agent_skill 表 | p1-part1 |
| T18 | AgentSkillEntity + Repository | p1-part1 |
| T19 | AgentSkillService CRUD + 权限 | p1-part1 |
| T20 | Flyway seed 3 bundled skills | p1-part1 |
| T21 | AgentSkillService 单测 | p1-part1 |
| T22 | AgentSkillController REST | p1-part2 |
| T23 | InternalAgentSkillController | p1-part2 |
| T24 | AgentStreamRequest skillIds | p1-part2 |
| T25 | AgentContextAssembler skill 注入 | p1-part2 |
| T26 | AgentRunContextDto + RunState 映射 | p1-part2 |
| T27 | skill_loader.py + frontmatter | p1-part3 |
| T28 | skill.py v2 HTTP+bundled | p1-part3 |
| T29 | events.py skill.* SSE | p1-part3 |
| T30 | schemas skill_ids + skill_prompt | p1-part3 |
| T31 | run_context skill 区块 | p1-part3 |
| T32 | pytest skill 套件 | p1-part3 |
| T33 | agentSkillApi.ts | p1-part4 |
| T34 | SkillsPage CRUD | p1-part4 |
| T35 | SkillPicker + ChatComposer | p1-part4 |
| T36 | TimelineSkillBlock + i18n | p1-part4 |
| T37 | useEditorAgentStream skill_ids | p1-part4 |
| T38 | bundled SKILL.md 内容 + AGENTS.md | p1-part5 |

### P2 — Agent Profile（T39–T58）

| ID | 任务 | 分册 |
|----|------|------|
| T39 | V27 迁移 agent_profile + agent_run 扩展 | p2-part1 |
| T40 | AgentProfileEntity + Repository | p2-part1 |
| T41 | Flyway seed 4 profiles | p2-part1 |
| T42 | AgentProfileService | p2-part1 |
| T43 | AgentRunEntity parent_run_id/profile_id | p2-part1 |
| T44 | AgentProfileController REST | p2-part2 |
| T45 | AgentRunTreeService + GET /runs/{id}/tree | p2-part2 |
| T46 | AgentStreamRequest profile hint（可选） | p2-part2 |
| T47 | profile_loader.py internal HTTP | p2-part3 |
| T48 | subagent.py profile_id + allowlist | p2-part3 |
| T49 | interaction.py Agent tool input 扩展 | p2-part3 |
| T50 | review_agent 迁 profile | p2-part3 |
| T51 | pytest profile/subagent | p2-part3 |
| T52 | agentProfileApi.ts | p2-part4 |
| T53 | ProfileManagementPage | p2-part4 |
| T54 | AgentRunTree 组件 | p2-part4 |
| T55 | SubagentPanel profile 展示 | p2-part4 |
| T56 | GlobalAgentTracePanel run 树 | p2-part4 |
| T57 | timeline i18n profile 标签 | p2-part4 |
| T58 | docs AGENT_TOOLS Agent profile_id | p2-part4 |

### P3 — Crew（T59–T78）

| ID | 任务 | 分册 |
|----|------|------|
| T59 | V28 迁移 crew_template + crew_run | p3-part1 |
| T60 | CrewTemplateEntity + CrewRunEntity | p3-part1 |
| T61 | CrewTemplateService + seed | p3-part1 |
| T62 | CrewTemplateController REST | p3-part1 |
| T63 | AgentStreamRequest crewId + crewVars | p3-part1 |
| T64 | Assembler 透传 crew 字段 | p3-part1 |
| T65 | crew_orchestrator.py 骨架 | p3-part2 |
| T66 | stage loop + gate 逻辑 | p3-part2 |
| T67 | crew.* SSE 事件 | p3-part2 |
| T68 | loop.py 入口 crew 分支 | p3-part2 |
| T69 | AGENT_CREW_ENABLED flag | p3-part2 |
| T70 | pytest crew fixtures | p3-part2 |
| T71 | crewApi.ts | p3-part3 |
| T72 | CrewPicker 编辑器 | p3-part3 |
| T73 | CrewStageProgress stepper | p3-part3 |
| T74 | CrewTemplateAdminPage | p3-part3 |
| T75 | Review FAIL 展示 | p3-part3 |
| T76 | 三套内置 crew JSON seed | p3-part4 |
| T77 | staging E2E 清单 | p3-part4 |
| T78 | feature flag + 回滚文档 | p3-part4 |

---

## 推荐执行顺序（含并行）

```
Week 1–2   P0-G1–G8（补全）  ‖  可启动 P1 T17–T21（Java DB 轨）
Week 2–3   P1 T22–T32
Week 3–4   P1 T33–T38
Week 5–6   P2 T39–T51
Week 6–7   P2 T52–T58
Week 8–10  P3 T59–T78
```

**硬依赖**：P2 依赖 P1 T24–T26（skill_ids 注入）；P3 依赖 P2 T48–T49（profile sub-run）。

---

## 执行约定

- **TDD**：每 Task 先写失败测试 → 红 → 实现 → 绿 → 提交。
- **提交前缀**：`feat(library):` / `feat(skills):` / `feat(agent-profile):` / `feat(crew):`
- **Java 编译**：`JAVA_HOME=/d/Programs/Java/jdk_21 mvn -pl <module> -am test`
- **Python**：`cd python-ai && python -m pytest tests/test_<area>_*.py -q`
- **前端**：`cd frontend && npx vitest run && npx tsc --noEmit`
- **本地栈**：`powershell -ExecutionPolicy Bypass -File scripts\_restart-dev-stack.ps1`
- **Feature flags**：默认 staging 开、prod 灰度

---

## 里程碑

| 日期 | 里程碑 | 验收 Task |
|------|--------|-----------|
| 2026-07 | 书库 RAG 可演示 | T1–T16 + P0-G1–G8 |
| 2026-08 | Skills 可选 | T17–T38 |
| 2026-09 | Profile 子 Agent | T39–T58 |
| 2026-10 | 专家团上线 | T59–T78 |

---

## 跨阶段文档同步（每个 PR checklist）

- [ ] `docs/AGENT_TOOLS.md`
- [ ] `python-ai/AGENTS.md`
- [ ] `frontend/src/i18n/locales/{en,zh}/editor.json`
- [ ] `frontend/src/i18n/locales/{en,zh}/dashboard.json`
- [ ] novel-studio `ResultLocalizer` 新错误码（若有 REST）
