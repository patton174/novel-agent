# P3 Part 1 — Crew Java DB + API

> 主索引：[2026-06-26-agent-platform-roadmap-index.md](./2026-06-26-agent-platform-roadmap-index.md)  
> 下一分册：[Part 2 — Python Orchestrator](./2026-06-26-agent-platform-p3-part2-python.md)  
> **前置**：P2 完成

---

## Task T59: V28 迁移 crew_template + crew_run

**Files:**
- Create: `novel-studio/studio-modules/studio-module-content/src/main/resources/db/migration/V28__crew_template.sql`

- [ ] **Step 1: crew_template**

```sql
CREATE TABLE IF NOT EXISTS crew_template (
    id              VARCHAR(64) PRIMARY KEY,
    user_id         BIGINT,
    display_name    VARCHAR(128) NOT NULL,
    description     TEXT,
    stages_json     JSONB NOT NULL,
    is_system       BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 2: crew_run**

```sql
CREATE TABLE IF NOT EXISTS crew_run (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_template_id    VARCHAR(64) NOT NULL,
    session_id          UUID NOT NULL,
    root_run_id         UUID NOT NULL,
    user_id             BIGINT NOT NULL,
    current_stage_key   VARCHAR(64),
    stage_outputs_json  JSONB NOT NULL DEFAULT '{}',
    status              VARCHAR(16) NOT NULL DEFAULT 'running',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crew_run_session ON crew_run (session_id);
```

- [ ] **Step 3: Flyway 验证**

- [ ] **Step 4: 提交**

---

## Task T60: CrewTemplateEntity + CrewRunEntity

**Files:**
- Create: `.../entity/CrewTemplateEntity.java`
- Create: `.../entity/CrewRunEntity.java`
- Create: repositories

- [ ] **Step 1: stages_json 结构校验 DTO**

```java
public record CrewStageDef(
    String key,
    String profileId,
    String promptTemplate,
    String outputSchema,  // PlanResult | none | custom
    String gate,          // always | on_plan_success | on_write_success
    String onFail         // abort_with_report | continue
) {}
```

- [ ] **Step 2: Entity + Repository**

- [ ] **Step 3: 提交**

---

## Task T61: CrewTemplateService + seed

**Files:**
- Create: `.../service/agent/CrewTemplateService.java`

- [ ] **Step 1: CRUD 同 AgentProfile 模式**

- [ ] **Step 2: validateStages(stages)**

- profile_id 必须存在
- key 唯一
- gate 枚举合法

- [ ] **Step 3: seed three-act-novel**（JSON 见 spec §4.4.2，Part 4 详）

- [ ] **Step 4: CrewTemplateServiceTest**

- [ ] **Step 5: 提交**

---

## Task T62: CrewTemplateController REST

**Files:**
- Create: `.../agent/controller/CrewTemplateController.java`
- Create: `.../internal/InternalCrewTemplateController.java`

- [ ] **Step 1: GET/POST/PUT/DELETE /api/agent/crews**

- [ ] **Step 2: GET /internal/agent/crews/{id}**

- [ ] **Step 3: MockMvc**

- [ ] **Step 4: 提交**

---

## Task T63: AgentStreamRequest crewId + crewVars

**Files:**
- Modify: `AgentStreamRequest.java`

- [ ] **Step 1: 加字段**

```java
    String crewId,
    Map<String, Object> crewVars
```

- [ ] **Step 2: AgentRunContextDto 加 crew_id, crew_vars**

- [ ] **Step 3: 提交（与 T64 合并）**

---

## Task T64: Assembler 透传 crew 字段

**Files:**
- Modify: `AgentContextAssembler.java`
- Modify: `AgentRunState.java`

- [ ] **Step 1: 若 crewId 非空**

- 校验 CrewTemplateService.getForUser
- context.put("crew_id", id)
- context.put("crew_template", stages 摘要 JSON)
- context.put("crew_vars", request.crewVars())

- [ ] **Step 2: 创建 crew_run 记录**（Coordinator 或 Assembler 后 hook）

- [ ] **Step 3: 编译 + 测试**

- [ ] **Step 4: 提交**

```bash
git commit -m "feat(crew): crew_template schema API stream crew_id"
```

---

Part 1 完成 → [Part 2 — Python](./2026-06-26-agent-platform-p3-part2-python.md)
