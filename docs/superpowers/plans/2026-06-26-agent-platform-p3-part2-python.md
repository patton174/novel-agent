# P3 Part 2 — Crew Python Orchestrator

> 上一分册：[Part 1 — Java](./2026-06-26-agent-platform-p3-part1-java.md)  
> 下一分册：[Part 3 — Frontend](./2026-06-26-agent-platform-p3-part3-frontend.md)

**Env:** `AGENT_CREW_ENABLED=false` 默认；staging `true`

---

## Task T65: crew_orchestrator.py 骨架

**Files:**
- Create: `python-ai/app/agent/harness/crew_orchestrator.py`
- Create: `python-ai/app/agent/harness/crew_models.py`
- Create: `python-ai/tests/test_crew_orchestrator_skeleton.py`

- [ ] **Step 1: CrewContext dataclass**

stage_outputs: dict[str, Any], current_stage_key, template stages list

- [ ] **Step 2: class CrewOrchestrator**

```python
async def run(self, ctx: AgentRunContext, emit) -> CrewResult:
    if not settings.agent_crew_enabled or not ctx.crew_id:
        return CrewResult.skipped()
    ...
```

- [ ] **Step 3: fetch template** internal HTTP `/internal/agent/crews/{id}`

- [ ] **Step 4: 测试 skipped when disabled**

- [ ] **Step 5: 提交**

---

## Task T66: stage loop + gate 逻辑

**Files:**
- Modify: `crew_orchestrator.py`
- Create: `python-ai/tests/test_crew_gates.py`

- [ ] **Step 1: for stage in template.stages**

- [ ] **Step 2: evaluate_gate(stage, crew_ctx)**

| gate | 条件 |
|------|------|
| always | True |
| on_plan_success | prev plan stage output_schema 校验通过 |
| on_write_success | prev 阶段含 WriteChapter success artifact |

- [ ] **Step 3: render_prompt(template, crew_ctx, ctx.crew_vars)**

简单 `{{plan.summary}}` 替换

- [ ] **Step 4: run_stage → run_subagent(profile_id, prompt)**

blocking；收集 structured output 存 stage_outputs[stage.key]

- [ ] **Step 5: on_fail abort_with_report**

停止后续 stage；返回 CrewResult.failed(report)

- [ ] **Step 6: gate 单测 fixture JSON**

- [ ] **Step 7: 提交**

---

## Task T67: crew.* SSE 事件

**Files:**
- Modify: `python-ai/app/agent/harness/events.py`
- Modify: `crew_orchestrator.py`

- [ ] **Step 1: crew.started** — `{crew_id, display_name, stage_count}`

- [ ] **Step 2: crew.stage.started** — `{stage_key, profile_id, index}`

- [ ] **Step 3: crew.stage.completed** — `{stage_key, status, summary}`

- [ ] **Step 4: crew.completed / crew.failed**

- [ ] **Step 5: AGENTS.md 更新**

- [ ] **Step 6: 提交**

---

## Task T68: loop.py 入口 crew 分支

**Files:**
- Modify: `python-ai/app/agent/loop.py` 或 `router.py` stream 入口

- [ ] **Step 1: query_loop 开始前**

```python
crew_result = await crew_orchestrator.run(ctx, emit)
if crew_result.handled:
    if crew_result.failed:
        # delivery error summary
        return
    # 可选：crew 完成后仍进主 loop 汇总，或 crew 最后一 stage 即 delivery
```

**产品决策（本计划采用）**：crew 全部成功后，**主 Agent 最后一轮**用 stage_outputs 生成用户可见 delivery（再跑 1 次轻量 loop 或 template 直出）。

- [ ] **Step 2: context_patch 注入 crew_stage_outputs**

- [ ] **Step 3: catalog refresh 每 stage 后**（WriteChapter 副作用）

- [ ] **Step 4: 集成测 mock subagent**

- [ ] **Step 5: 提交**

---

## Task T69: AGENT_CREW_ENABLED + config

**Files:**
- Modify: `python-ai/app/config.py`

- [ ] **Step 1: agent_crew_enabled: bool = False**

- [ ] **Step 2: worker .env.example 注释**

- [ ] **Step 3: crew_id 非空但 disabled → log warning + 忽略**

- [ ] **Step 4: 提交**

---

## Task T70: pytest crew fixtures

**Files:**
- Create: `python-ai/tests/fixtures/crew/three_act.json`
- Create: `python-ai/tests/test_crew_three_act.py`

- [ ] **Step 1: 三 stage mock subagent 返回固定 JSON**

- [ ] **Step 2: 断言 stage 顺序 + outputs 键 plan/write/review**

- [ ] **Step 3: review FAIL → abort**

- [ ] **Step 4: 全量 pytest**

```bash
cd python-ai && python -m pytest tests/test_crew_*.py -q
```

- [ ] **Step 5: 提交**

```bash
git commit -m "feat(crew): CrewOrchestrator stages gates SSE"
```

---

Part 2 完成 → [Part 3 — Frontend](./2026-06-26-agent-platform-p3-part3-frontend.md)
