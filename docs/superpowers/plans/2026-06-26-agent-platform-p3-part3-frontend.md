# P3 Part 3 — Crew 前端

> 上一分册：[Part 2 — Python](./2026-06-26-agent-platform-p3-part2-python.md)  
> 下一分册：[Part 4 — Seed + E2E](./2026-06-26-agent-platform-p3-part4-e2e.md)

**Feature flag:** `VITE_FEATURE_AGENT_CREW`

---

## Task T71: crewApi.ts

**Files:**
- Create: `frontend/src/api/crewApi.ts`
- Create: `frontend/src/types/crew.ts`

- [ ] **Step 1: CrewTemplateSummary / Detail / CrewStageDef 类型**

- [ ] **Step 2: fetchCrewTemplates, fetchCrewTemplate, CRUD**

- [ ] **Step 3: vitest**

- [ ] **Step 4: 提交**

---

## Task T72: CrewPicker 编辑器

**Files:**
- Create: `frontend/src/components/agent/CrewPicker.tsx`
- Modify: `ChatComposer.tsx`, `EditorChatPanel.tsx`, `EditorPage.tsx`

- [ ] **Step 1: 单选 crew 模板**（与 Skill 多选互斥或可同时：产品默认 **crew 优先**，选 crew 时清空 skills 或合并规则写 README）

- [ ] **Step 2: 展示 display_name + description + stage 数**

- [ ] **Step 3: useEditorAgentStream 发 crew_id + crew_vars**

```typescript
crew_id: selectedCrew?.id,
crew_vars: { target_chapter: currentChapterNumber }
```

- [ ] **Step 4: flag gate**

- [ ] **Step 5: 提交**

---

## Task T73: CrewStageProgress stepper

**Files:**
- Create: `frontend/src/components/agent/CrewStageProgress.tsx`
- Modify: `agentStreamTimeline.ts`

- [ ] **Step 1: 解析 crew.started → 初始化 steps**

- [ ] **Step 2: crew.stage.started / completed 更新 step 状态**

pending / active / done / failed

- [ ] **Step 3: 横条 stepper 挂 EditorChatPanel 顶栏**

- [ ] **Step 4: i18n editor:crew.stage.*

- [ ] **Step 5: vitest reducer**

- [ ] **Step 6: 提交**

---

## Task T74: CrewTemplateAdminPage

**Files:**
- Create: `frontend/src/pages/admin/CrewTemplateAdminPage.tsx`
- Modify: Admin 路由 + sidebar

- [ ] **Step 1: 列表系统 + 自定义 crew**

- [ ] **Step 2: JSON 编辑器（Monaco 或 textarea）编辑 stages_json**

- [ ] **Step 3: validate 按钮调后端或前端 schema 校验**

- [ ] **Step 4: i18n admin:crew.*

- [ ] **Step 5: 提交**

---

## Task T75: Review FAIL 展示

**Files:**
- Create: `frontend/src/components/agent/CrewFailureReport.tsx`
- Modify: `AssistantStreamTimeline.tsx`

- [ ] **Step 1: crew.failed payload 含 report markdown**

- [ ] **Step 2: 专用卡片展示 PASS/WARN/FAIL + 问题列表**

- [ ] **Step 3: 链到 continuity-reviewer 子 run timeline**

- [ ] **Step 4: 提交**

```bash
git commit -m "feat(crew): frontend CrewPicker stage progress admin"
```

---

Part 3 完成 → [Part 4 — E2E](./2026-06-26-agent-platform-p3-part4-e2e.md)
