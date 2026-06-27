# P1 Part 3 — Skills Python 运行时

> 上一分册：[Part 2 — Java API](./2026-06-26-agent-platform-p1-part2-java-api.md)  
> 下一分册：[Part 4 — Frontend](./2026-06-26-agent-platform-p1-part4-frontend.md)

---

## Task T27: skill_loader.py + frontmatter 解析

**Files:**
- Create: `python-ai/app/agent/harness/skill_loader.py`
- Create: `python-ai/tests/test_skill_loader.py`

- [ ] **Step 1: ParsedSkill dataclass**

```python
@dataclass
class ParsedSkill:
    name: str
    version: str
    description: str
    tools: list[str]
    body: str  # markdown body without frontmatter
    locale: str = "zh"
```

- [ ] **Step 2: parse_skill_markdown(text) -> ParsedSkill**

支持 `---` YAML frontmatter（用 `yaml.safe_load` 或简易 regex）；缺字段默认 name=`unknown`

- [ ] **Step 3: load_bundled(name) -> Path**

`python-ai/skills/bundled/{name}/SKILL.md` 或 `{name}.md`

- [ ] **Step 4: 测试 frontmatter + 无 frontmatter 纯 markdown**

- [ ] **Step 5: 提交**

---

## Task T28: skill.py v2 HTTP + bundled fallback

**Files:**
- Modify: `python-ai/app/agent/tools/skill.py`
- Modify: `python-ai/app/agent/tools/schemas.py` — `SkillInput` 加 `skill_id: str | None`
- Create: `python-ai/app/agent/backend/skill_api.py`（HTTP client → novel-studio internal）

- [ ] **Step 1: skill_api.fetch_skill(skill_id, user_id)**

GET `/internal/agent/skills/{idOrSlug}` with internal key + user header

- [ ] **Step 2: invoke_skill 逻辑**

1. 若 `inp.skill_id` → HTTP fetch
2.  elif `inp.skill` → bundled 本地 → AGENT_SKILLS_DIR  legacy
3. parse → `context_patch={"skill_prompt": body, "last_skill": name}`
4. 合并已有 skill_prompt（append）

- [ ] **Step 3: is_enabled 改为始终 true**（有 bundled 或 internal API 配置）

- [ ] **Step 4: 测试 mock httpx**

- [ ] **Step 5: 提交**

---

## Task T29: events.py skill.* SSE

**Files:**
- Modify: `python-ai/app/agent/harness/events.py`
- Modify: `python-ai/app/agent/tools/skill.py`（emit 调用）

- [ ] **Step 1: emit_skill_started(ctx, name)**

payload: `{ "type": "skill.started", "skill": { "id", "name" } }`

- [ ] **Step 2: emit_skill_loaded / emit_skill_failed**

- [ ] **Step 3: invoke_skill 成功/失败各 emit 一次**

- [ ] **Step 4: 确认 sse_bridge 透传未知 type（或注册 handler）**

- [ ] **Step 5: 提交**

---

## Task T30: schemas skill_ids + skill_prompt

**Files:**
- Modify: `python-ai/app/agent/schemas.py`

- [ ] **Step 1: AgentRunContext 加**

```python
    skill_ids: list[dict[str, Any]] = Field(default_factory=list)
    skill_prompt: str = ""
```

- [ ] **Step 2: 确认 Java DTO snake_case 映射**

- [ ] **Step 3: 提交**

---

## Task T31: run_context 渲染 skill 区块

**Files:**
- Modify: `python-ai/app/agent/context/prompting/run_context.py`
- Create: `python-ai/tests/test_skill_run_context.py`

- [ ] **Step 1: assemble 返回 dict 加 `skills` 区块**

```python
if ctx.skill_prompt:
    blocks["skills"] = {
        "active": [s.get("name") for s in (ctx.skill_ids or [])],
        "prompt": ctx.skill_prompt[:4000],
    }
```

- [ ] **Step 2: system prompt 模板引用 `skills` 段**（查 prompting 模板位置一并改）

- [ ] **Step 3: 测试有/无 skill_prompt**

- [ ] **Step 4: 提交**

---

## Task T32: pytest skill 套件汇总

**Files:**
- 汇总 `tests/test_skill_*.py`

- [ ] **Step 1: 跑全量**

```bash
cd python-ai && python -m pytest tests/test_skill_loader.py tests/test_skill_run_context.py -q
```

- [ ] **Step 2: 更新 `python-ai/AGENTS.md` SSE 表加 skill.* 行**

- [ ] **Step 3: 提交**

```bash
git commit -m "feat(skills): python Skill v2 loader SSE run_context"
```

---

Part 3 完成 → [Part 4 — Frontend](./2026-06-26-agent-platform-p1-part4-frontend.md)
