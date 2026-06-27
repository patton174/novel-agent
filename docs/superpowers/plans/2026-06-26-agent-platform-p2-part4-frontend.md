# P2 Part 4 — Agent Profile 前端

> 上一分册：[Part 3 — Python](./2026-06-26-agent-platform-p2-part3-python.md)

---

## Task T52: agentProfileApi.ts

**Files:**
- Create: `frontend/src/api/agentProfileApi.ts`
- Create: `frontend/src/types/agentProfile.ts`

- [ ] **Step 1: 类型 AgentProfileSummary / Detail**

- [ ] **Step 2: fetchAgentProfiles, fetchAgentProfile, create, update, delete**

- [ ] **Step 3: fetchRunTree(runId)**

- [ ] **Step 4: vitest**

- [ ] **Step 5: 提交**

---

## Task T53: ProfileManagementPage

**Files:**
- Create: `frontend/src/pages/dashboard/agent/ProfileManagementPage.tsx`
- Modify: `App.tsx` 路由 `/dashboard/agent/profiles`

- [ ] **Step 1: 列表 + 克隆系统 Profile**

- [ ] **Step 2: 编辑 Dialog**

字段：displayName, description, systemPromptTemplate, toolAllowlist（multi select from AGENT_TOOLS 常量）, maxTurns, skillIds（Skill 多选）

- [ ] **Step 3: 系统 profile 只读 + 「克隆为我的」**

- [ ] **Step 4: i18n dashboard:agentProfiles.*

- [ ] **Step 5: 提交**

---

## Task T54: AgentRunTree 组件

**Files:**
- Create: `frontend/src/components/agent/AgentRunTree.tsx`
- Create: `frontend/src/components/agent/AgentRunTreeNode.tsx`

- [ ] **Step 1: 递归树 UI**

节点：roleLabel / profileId / status / duration

- [ ] **Step 2: 点击节点滚动 SubagentPanel 或 filter timeline**

- [ ] **Step 3: loading / empty 态**

- [ ] **Step 4: 提交**

---

## Task T55: SubagentPanel profile 展示

**Files:**
- Modify: `frontend/src/components/agent/timeline/SubagentPanel.tsx`
- Modify: `frontend/src/utils/subagentSummary.ts`

- [ ] **Step 1: 从 SSE 读 profile_id / display_name**

- [ ] **Step 2: 标题行：`{display_name} · {description}`**

- [ ] **Step 3: i18n fallback**

- [ ] **Step 4: 提交**

---

## Task T56: GlobalAgentTracePanel run 树

**Files:**
- Modify: `frontend/src/components/agent/GlobalAgentTracePanel.tsx`

- [ ] **Step 1: 当前 run 完成后 fetchRunTree**

- [ ] **Step 2: 侧边栏嵌入 AgentRunTree**

- [ ] **Step 3: 移动端折叠**

- [ ] **Step 4: 提交**

---

## Task T57: timeline i18n profile 标签

**Files:**
- Modify: `editor.json` en/zh — `timeline.subagent.profile.*`

- [ ] **Step 1: 各 profile_id 友好名映射**

chapter-writer → 「章节写手」等

- [ ] **Step 2: 提交**

---

## Task T58: 文档与 P2 DoD

- [ ] **Step 1: AGENT_TOOLS.md Agent.profile_id**

- [ ] **Step 2: staging 验收**

| # | 步骤 |
|---|------|
| 1 | 主 Agent 派发 Agent(profile_id=chapter-writer) |
| 2 | UI 子面板显示「章节写手」 |
| 3 | Run 树 1 父 1 子 |
| 4 | writer profile 无法调用 WriteMemory（若不在 allowlist） |

- [ ] **Step 3: 提交**

```bash
git commit -m "feat(agent-profile): frontend profile admin run tree"
```

---

## P2 完成定义

- [ ] T39–T58 完成
- [ ] sub-run 失败率 <10% staging 抽样
