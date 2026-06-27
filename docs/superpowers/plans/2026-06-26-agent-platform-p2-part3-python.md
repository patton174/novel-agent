# P2 Part 3 — Agent Profile Python SubAgent

> 上一分册：[Part 2 — Java API](./2026-06-26-agent-platform-p2-part2-java-api.md)  
> 下一分册：[Part 4 — Frontend](./2026-06-26-agent-platform-p2-part4-frontend.md)

---

## Task T47: profile_loader.py

**Files:**
- Create: `python-ai/app/agent/harness/profile_loader.py`
- Create: `python-ai/app/agent/backend/profile_api.py`
- Create: `python-ai/tests/test_profile_loader.py`

- [ ] **Step 1: fetch_profile(profile_id, user_id) -> AgentProfileModel**

Pydantic: id, display_name, system_prompt_template, tool_allowlist, model_override, max_turns, skill_ids

- [ ] **Step 2: 内存 cache TTL 60s**

- [ ] **Step 3: bundled fallback JSON** `python-ai/profiles/bundled/*.json`（与 Java seed 同步）

- [ ] **Step 4: 测试 HTTP mock + fallback**

- [ ] **Step 5: 提交**

---

## Task T48: subagent.py profile_id + allowlist

**Files:**
- Modify: `python-ai/app/agent/harness/subagent.py`
- Modify: `python-ai/app/agent/tools/registry.py`（加 filter helper）

- [ ] **Step 1: run_subagent(..., profile_id: str = "chapter-writer")**

- [ ] **Step 2: load profile → build_subagent_system_prompt(profile)**

替换硬编码 `build_subagent_system_prompt()`；模板渲染 `{display_name}`, `{tool_list}`

- [ ] **Step 3: filter_tools(allowlist)**

```python
def tools_for_profile(profile, all_tools):
    if not profile.tool_allowlist:
        return [t for t in all_tools if t.name not in SUBAGENT_EXCLUDED_TOOLS]
    allowed = set(profile.tool_allowlist)
    return [t for t in all_tools if t.name in allowed]
```

- [ ] **Step 4: context_patch**

`_subagent_profile_id`, `_max_turns` from profile.max_turns

- [ ] **Step 5: merge profile skill_ids → skill_prompt via skill_loader**

- [ ] **Step 6: pytest allowlist 拒绝 WriteChapter 当 profile 无权限**

- [ ] **Step 7: 提交**

---

## Task T49: interaction.py Agent tool input 扩展

**Files:**
- Modify: `python-ai/app/agent/tools/interaction.py`（Agent 工具定义处）
- Modify: `python-ai/app/agent/tools/schemas.py`

- [ ] **Step 1: AgentToolInput**

```python
class AgentToolInput(BaseModel):
    description: str
    prompt: str | None = None
    profile_id: str = "chapter-writer"
```

- [ ] **Step 2: invoke 传 profile_id 到 run_subagent**

- [ ] **Step 3: 更新 tool description 文档字符串**

- [ ] **Step 4: docs/AGENT_TOOLS.md Agent 工具参数表**

- [ ] **Step 5: 提交**

---

## Task T50: review_agent 迁 profile

**Files:**
- Modify: `python-ai/app/agent/harness/review_agent.py`
- Modify: `python-ai/app/agent/harness/review_agent_sse.py`

- [ ] **Step 1: 硬编码 prompt 迁到 profile `continuity-reviewer`**

- [ ] **Step 2: 调用 run_subagent(profile_id="continuity-reviewer")**

- [ ] **Step 3: 回归现有 review 测试**

- [ ] **Step 4: 提交**

---

## Task T51: pytest profile/subagent 汇总

**Files:**
- Create: `python-ai/tests/test_subagent_profile.py`

- [ ] **Step 1: depth=2 拒绝**

- [ ] **Step 2: 非法 profile_id fallback chapter-writer 或 error**

- [ ] **Step 3: SSE payload 含 profile_id**

Modify `subagent_sse.py` emit 时加 `profile_id`, `display_name`

- [ ] **Step 4: 全量 pytest agent harness**

```bash
cd python-ai && python -m pytest tests/test_subagent_profile.py tests/test_profile_loader.py -q
```

- [ ] **Step 5: 提交**

```bash
git commit -m "feat(agent-profile): subagent profile_id tool allowlist"
```

---

Part 3 完成 → [Part 4 — Frontend](./2026-06-26-agent-platform-p2-part4-frontend.md)
