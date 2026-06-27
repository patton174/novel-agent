# P1 Part 4 — Skills 前端

> 上一分册：[Part 3 — Python](./2026-06-26-agent-platform-p1-part3-python.md)  
> 下一分册：[Part 5 — Content](./2026-06-26-agent-platform-p1-part5-content.md)

**Feature flag:** `import.meta.env.VITE_FEATURE_AGENT_SKILLS === 'true'`

---

## Task T33: agentSkillApi.ts

**Files:**
- Create: `frontend/src/api/agentSkillApi.ts`
- Create: `frontend/src/types/agentSkill.ts`

- [ ] **Step 1: 类型**

```typescript
export interface AgentSkillSummary {
  id: string
  name: string
  description?: string
  locale: string
  isSystem: boolean
  version: number
  tools?: string[]
}
export interface AgentSkillDetail extends AgentSkillSummary {
  content: string
}
```

- [ ] **Step 2: API 函数**

`fetchAgentSkills()`, `fetchAgentSkill(id)`, `createAgentSkill`, `updateAgentSkill`, `deleteAgentSkill` — 走 `secureFetch` + resultApi

- [ ] **Step 3: vitest mock fetch**

- [ ] **Step 4: 提交**

---

## Task T34: SkillsPage CRUD

**Files:**
- Create: `frontend/src/pages/dashboard/skills/SkillsPage.tsx`
- Create: `frontend/src/pages/dashboard/skills/SkillEditDialog.tsx`
- Modify: `frontend/src/App.tsx` — 路由 `/dashboard/skills`
- Modify: dashboard 侧栏 nav

- [ ] **Step 1: 列表 ProTable**

列：name, description, locale, isSystem, updatedAt；系统 Skill 只读

- [ ] **Step 2: 新建/编辑 Modal**

字段：name（create 可编辑）, description, content（Markdown textarea）, locale select

- [ ] **Step 3: 删除 confirmDialog**

- [ ] **Step 4: i18n `dashboard:skills.*` en/zh**

- [ ] **Step 5: 提交**

---

## Task T35: SkillPicker + ChatComposer

**Files:**
- Create: `frontend/src/components/agent/SkillPicker.tsx`
- Modify: `frontend/src/components/chat/ChatComposer.tsx`
- Modify: `frontend/src/components/editor/EditorChatPanel.tsx`
- Modify: `frontend/src/pages/EditorPage.tsx`

- [ ] **Step 1: SkillPicker UI**

类似 ReferenceBookPicker：`/` 或工具栏按钮打开；多选 max 3；chip 展示 name

- [ ] **Step 2: ChatComposer props**

```typescript
selectedSkills?: AgentSkillSummary[]
onSelectedSkillsChange?: (skills: AgentSkillSummary[]) => void
```

- [ ] **Step 3: EditorPage 状态**

`useEditorAgentStream` 暴露 `selectedSkills`, `setSelectedSkills`

- [ ] **Step 4: flag 关闭时隐藏**

- [ ] **Step 5: 提交**

---

## Task T36: TimelineSkillBlock + i18n

**Files:**
- Create: `frontend/src/components/agent/timeline/TimelineSkillBlock.tsx`
- Modify: `frontend/src/utils/agentStreamTimeline.ts` — 解析 `skill.started` / `skill.loaded` / `skill.failed`
- Modify: `frontend/src/components/agent/timeline/AssistantStreamTimeline.tsx`
- Modify: `frontend/src/i18n/locales/en/editor.json`, `zh/editor.json`

- [ ] **Step 1: reducer 加 SkillTimelineStep 类型**

- [ ] **Step 2: TimelineSkillBlock 展示 name + status icon**

- [ ] **Step 3: i18n keys**

`editor:timeline.skill.started`, `.loaded`, `.failed`

- [ ] **Step 4: vitest timeline parse**

- [ ] **Step 5: 提交**

---

## Task T37: useEditorAgentStream skill_ids

**Files:**
- Modify: `frontend/src/hooks/editor/useEditorAgentStream.ts`
- Modify: `frontend/src/types/agent.ts`

- [ ] **Step 1: state selectedSkills + ref**

- [ ] **Step 2: openAgentStream body**

```typescript
skill_ids: selectedSkillsRef.current.map(s => s.id || s.name).slice(0, 3)
```

- [ ] **Step 3: AgentStreamRequestBody 类型加 skill_ids**

- [ ] **Step 4: 发送后可选清空 skills（产品决策：默认保留）**

- [ ] **Step 5: tsc + vitest**

```bash
cd frontend && npx tsc --noEmit && npx vitest run src/hooks/editor/useEditorAgentStream.test.ts 2>/dev/null || true
```

- [ ] **Step 6: 提交**

```bash
git commit -m "feat(skills): frontend SkillsPage SkillPicker timeline"
```

---

Part 4 完成 → [Part 5 — Content](./2026-06-26-agent-platform-p1-part5-content.md)
