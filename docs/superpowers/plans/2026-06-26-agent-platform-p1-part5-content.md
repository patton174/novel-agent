# P1 Part 5 — Skills 内置内容与文档

> 上一分册：[Part 4 — Frontend](./2026-06-26-agent-platform-p1-part4-frontend.md)

---

## Task T38: bundled SKILL.md 内容 + 文档

**Files:**
- Create: `python-ai/skills/bundled/fanqie-chapter-hook/SKILL.md`
- Create: `python-ai/skills/bundled/sweet-romance-beat/SKILL.md`
- Create: `python-ai/skills/bundled/mystery-cold-open/SKILL.md`
- Modify: `docs/AGENT_TOOLS.md`
- Modify: `python-ai/AGENTS.md`
- Modify: DB seed content（与 T20 一致）

---

## Task T38.1: fanqie-chapter-hook

- [ ] **Step 1: frontmatter**

```yaml
---
name: fanqie-chapter-hook
version: 1.0.0
description: 番茄短篇章末钩子写法
tools: [ReadChapter, WriteChapter, SearchKnowledge]
locale: zh
---
```

- [ ] **Step 2: 正文要点（800–1500 字）**

- 章末 200 字内制造悬念/反转/情绪峰值
- 禁止平铺直叙收束
- 钩子类型：危机、揭秘、情感抉择
- 输出前自检清单

- [ ] **Step 3: 同步 Flyway seed INSERT**

---

## Task T38.2: sweet-romance-beat

- [ ] **Step 1: 甜宠感情线四节拍**（相识→试探→确认→危机修复）

- [ ] **Step 2: 对话张力与误写禁忌**

- [ ] **Step 3: seed + bundled 文件**

---

## Task T38.3: mystery-cold-open

- [ ] **Step 1: 冷开场 300 字内抛核心谜题**

- [ ] **Step 2: 线索投放节奏；避免过早揭底**

- [ ] **Step 3: seed + bundled 文件**

---

## Task T38.4: 文档

- [ ] **Step 1: AGENT_TOOLS.md 增 Skill 工具**

| 参数 | 说明 |
|------|------|
| skill | bundled slug |
| skill_id | UUID 或 system slug（v2） |

- [ ] **Step 2: AGENTS.md SSE 表**

- [ ] **Step 3: spec 链接回主索引**

- [ ] **Step 4: staging 验收**

| # | 步骤 |
|---|------|
| 1 | Skills 页看到 3 个系统 Skill |
| 2 | 编辑器选「章末钩子」 |
| 3 | Timeline 见 skill.loaded |
| 4 | Agent 写章末有明显钩子结构 |

- [ ] **Step 5: 提交**

```bash
git commit -m "feat(skills): bundled writing skills + docs"
```

---

## P1 完成定义（DoD）

- [ ] T17–T38 全部完成
- [ ] `VITE_FEATURE_AGENT_SKILLS=true` staging 验收 4 项
- [ ] usage_event.meta 含 skill_ids（billing 模块若有 meta 字段，T25 后补埋点任务）
