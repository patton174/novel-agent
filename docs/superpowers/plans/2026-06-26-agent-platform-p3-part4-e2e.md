# P3 Part 4 — Crew 种子数据 + E2E + 发布

> 上一分册：[Part 3 — Frontend](./2026-06-26-agent-platform-p3-part3-frontend.md)

---

## Task T76: 三套内置 crew JSON seed

**Files:**
- Modify: `V28__crew_template.sql` 或 seed migration
- Create: `docs/superpowers/fixtures/crew-three-act.json`（文档样例）

---

### T76.1: three-act-novel

- [ ] **Step 1: stages**

| key | profile_id | gate |
|-----|------------|------|
| plan | main-editor | always |
| write | chapter-writer | on_plan_success |
| review | continuity-reviewer | on_write_success |

- [ ] **Step 2: prompt_template 中文占位**

- [ ] **Step 3: on_fail review → abort_with_report**

- [ ] **Step 4: INSERT SQL**

---

### T76.2: fanqie-short

- [ ] **Step 1: stages: hook_open → fast_body → hook_check**

- [ ] **Step 2: hook_check profile style-editor + skill fanqie-chapter-hook**

- [ ] **Step 3: INSERT**

---

### T76.3: mystery-serial

- [ ] **Step 1: stages: clue_sheet → chapter → continuity review**

- [ ] **Step 2: INSERT**

- [ ] **Step 3: CrewTemplateService 单测加载 3 套**

- [ ] **Step 4: 提交**

---

## Task T77: staging E2E 清单

**Files:**
- Create: `docs/superpowers/plans/2026-06-26-agent-platform-e2e-checklist.md`（可选独立）

- [ ] **Step 1: 环境**

- `AGENT_CREW_ENABLED=true`
- `VITE_FEATURE_AGENT_CREW=true`
- 用户有已索引参考书（P0）
- 用户可选 Skill（P1）

- [ ] **Step 2: three-act-novel 流程**

| # | 操作 | 期望 |
|---|------|------|
| 1 | 选专家团「三幕式」 | stepper 3 步 |
| 2 | 输入「写第一章大纲并起草」 | plan stage 完成 |
| 3 | | write stage 调 WriteChapter |
| 4 | | review stage PASS/WARN |
| 5 | | 用户见汇总 delivery |
| 6 | Run 树 | 1 root + ≥3 sub-runs |

- [ ] **Step 3: review FAIL 路径**

人为构造矛盾设定 → FAIL → CrewFailureReport

- [ ] **Step 4: 配额**

crew 多 stage token 计入 session usage

- [ ] **Step 5: 记录结果截图/日志归档**

---

## Task T78: feature flag + 回滚文档

**Files:**
- Modify: `novel-studio/deploy/README.md`（或 deploy-ops 引用段）
- Modify: `frontend/.env.example`
- Modify: `python-ai/.env.example`

- [ ] **Step 1: 环境变量表**

| 变量 | 默认 | 说明 |
|------|------|------|
| AGENT_CREW_ENABLED | false | Python crew 编排 |
| VITE_FEATURE_AGENT_SKILLS | false prod | 前端 Skills |
| VITE_FEATURE_AGENT_CREW | false prod | 前端 Crew |
| VITE_FEATURE_LIBRARY_REF | true | 书库 @ |

- [ ] **Step 2: 回滚步骤**

1. prod env 设 false  
2. redeploy frontend + python-ai  
3. 无需 DB rollback（表可留空）

- [ ] **Step 3: 灰度建议**

staging 全量 → 5% 付费用户 → 全量

- [ ] **Step 4: 更新主 spec 状态为「已计划」**

- [ ] **Step 5: 提交**

```bash
git commit -m "docs(crew): e2e checklist deploy flags"
```

---

## 全路线图 DoD（P0–P3）

- [ ] 主索引 T1–T78 全部 checkbox（或明确 defer 项）
- [ ] staging E2E 三阶段（RAG / Skills / Crew）通过
- [ ] CI deploy-novel-studio + deploy-python-ai + deploy-frontend 绿
- [ ] CRM 可观测：crew_run 表可查失败率

---

## 附录：跨模块埋点（可选 follow-up）

| 任务 | 说明 |
|------|------|
| T-OPS-1 | usage_event.meta 增加 skill_ids, profile_id, crew_id |
| T-OPS-2 | Admin Analytics：Skill 使用率、Crew 完成率 |
| T-OPS-3 | 子 run token 报表 |
