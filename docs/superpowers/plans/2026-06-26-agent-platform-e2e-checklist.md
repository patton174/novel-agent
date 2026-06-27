# Agent 平台 Staging E2E 验收清单（P0–P3）

> **环境**：staging `https://staging.novel-agent.cn`（或 CN dev 栈）  
> **前置**：`deploy-novel-studio` + `deploy-python-ai` + `deploy-frontend` 绿  
> **记录**：每轮测试归档截图 + `crew_run` / `agent_run` 日志到 `docs/superpowers/e2e-runs/YYYY-MM-DD/`

---

## 0. 环境开关

| 变量 | Staging 值 | 说明 |
|------|------------|------|
| `AGENT_CREW_ENABLED` | `true` | Python `CrewOrchestrator` |
| `VITE_FEATURE_AGENT_CREW` | `true` | 编辑器 CrewPicker + stepper |
| `VITE_FEATURE_AGENT_SKILLS` | `true` | SkillPicker + 管理页 |
| `VITE_FEATURE_LIBRARY_REF` | `true` | 编辑器 @ 参考书 |

**测试账号**：已登录付费用户；书库中 ≥1 本 `index_status=indexed` 私人参考书；可选自定义 Skill。

---

## P0 — 书库 RAG

| # | 操作 | 期望 |
|---|------|------|
| P0-1 | 我的书库上传 TXT/EPUB | 列表出现新书，`index_status` 从 `pending` → `indexing` → `indexed`（或失败可重试） |
| P0-2 | 编辑器 ChatComposer `@` 选已索引书 | 消息气泡显示参考书 chip；stream 请求含 `referenced_books` |
| P0-3 | Agent 调用 `SearchKnowledge(scope=book:…)` | 命中片段，含章节标题；未索引书返回 indexing hint |
| P0-4 | 索引中参考书 @ 后发消息 | UI 显示「索引中」徽章，不阻塞发送 |
| P0-5 | system / run_context | 参考书摘要区块出现在 Agent 上下文（日志或 debug 面板） |

---

## P1 — Skills

| # | 操作 | 期望 |
|---|------|------|
| P1-1 | Dashboard → Skills 列表 | 可见 bundled：`fanqie-chapter-hook`、`sweet-romance-beat`、`mystery-cold-open` |
| P1-2 | 创建用户自定义 Skill 并保存 | CRUD 成功；列表刷新 |
| P1-3 | 编辑器 SkillPicker 选 1–3 个 Skill 发消息 | 请求含 `skill_ids`；timeline 出现 `skill.loaded` |
| P1-4 | Agent 运行中 `Skill` 工具 | 按需加载正文；不撑爆 context（≤3 skill/run） |
| P1-5 | 英文 UI | Skill 名称 i18n 正常；SSE 中文摘要可接受或前端映射 |

---

## P2 — Agent Profile + 子 Run

| # | 操作 | 期望 |
|---|------|------|
| P2-1 | Dashboard → Agent Profiles | 可见系统 profile：`main-editor`、`chapter-writer`、`continuity-reviewer`、`style-editor` |
| P2-2 | 主 Agent 派发 `Agent(profile_id=chapter-writer)` | sub-run 创建；`parent_run_id` 非空 |
| P2-3 | GlobalAgentTracePanel / Run 树 | 1 root + ≥1 child；可折叠、跳转 timeline |
| P2-4 | SubagentPanel | 显示 `profile_id` 与角色标签（i18n） |
| P2-5 | 非法 `profile_id` | 结构化错误；parent run 不崩溃 |
| P2-6 | sub-run token 用量 | 计入 parent session usage |

---

## P3 — 专家团 Crew

### P3-A: three-act-novel 快乐路径

| # | 操作 | 期望 |
|---|------|------|
| P3-1 | CrewPicker 选「三幕式长篇」 | stepper 显示 3 步：plan / write / review |
| P3-2 | 输入「写第一章大纲并起草」 | `crew.started` SSE；`crew.stage.started` plan |
| P3-3 | plan stage 完成 | `crew.stage.completed`；结构化计划输出 |
| P3-4 | write stage | 调用 `WriteChapter`；章节草稿落库 |
| P3-5 | review stage | PASS 或 WARN；`crew.stage.completed` |
| P3-6 | 全流程结束 | 用户见汇总 delivery；`crew.completed` |
| P3-7 | Run 树 | 1 root + ≥3 sub-runs（各 stage 对应 profile） |

### P3-B: review FAIL 路径

| # | 操作 | 期望 |
|---|------|------|
| P3-8 | 人为构造矛盾设定（如角色已死却出场）后发 crew 消息 | review stage 返回 FAIL |
| P3-9 | FAIL 后 | `crew.failed`；`CrewFailureReport` 用户可读；后续 stage 不执行 |
| P3-10 | `crew_run` 表 | `status=failed`；`stage_outputs_json` 含 review 输出 |

### P3-C: fanqie-short + mystery-serial 冒烟

| # | 操作 | 期望 |
|---|------|------|
| P3-11 | 选「番茄短篇」 | 3 步 stepper；hook_check 使用 `style-editor` + `fanqie-chapter-hook` |
| P3-12 | 选「悬疑连载」 | clue_sheet → chapter → continuity_review 顺序执行 |
| P3-13 | GET `/api/agent/crews` | 返回 3 套系统模板（Flyway V28 seed） |

### P3-D: 配额与可观测

| # | 操作 | 期望 |
|---|------|------|
| P3-14 | 完成一次三幕式 crew run | session usage 含各 stage token 合计 |
| P3-15 | CRM / Admin 查 `crew_run` | 可查失败率、模板 ID、耗时 |

---

## 回滚演练（T78）

1. 生产 env 设 `AGENT_CREW_ENABLED=false`、`VITE_FEATURE_AGENT_CREW=false`
2. redeploy `python-ai` + `frontend`
3. 确认编辑器无 CrewPicker；带 `crew_id` 的请求被忽略（log warning）
4. **无需 DB rollback**（`crew_template` / `crew_run` 表可保留）

**灰度建议**：staging 全量 → 5% 付费用户 → 全量

---

## 签收

| 阶段 | 测试人 | 日期 | 结果 |
|------|--------|------|------|
| P0 | | | ☐ Pass / ☐ Fail |
| P1 | | | ☐ Pass / ☐ Fail |
| P2 | | | ☐ Pass / ☐ Fail |
| P3 | | | ☐ Pass / ☐ Fail |

**CI**：`deploy-novel-studio` + `deploy-python-ai` + `deploy-frontend` 绿后方可标记 P3 Pass。
