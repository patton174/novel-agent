# P2 Part 1 — Agent Profile Java 数据层

> 主索引：[2026-06-26-agent-platform-roadmap-index.md](./2026-06-26-agent-platform-roadmap-index.md)  
> 下一分册：[Part 2 — API + RunTree](./2026-06-26-agent-platform-p2-part2-java-api.md)  
> **前置**：P1 T24–T26（skill_ids 注入）

---

## Task T39: V27 迁移 agent_profile + agent_run 扩展

**Files:**
- Create: `novel-studio/studio-modules/studio-module-content/src/main/resources/db/migration/V27__agent_profile.sql`

- [ ] **Step 1: agent_profile 表**

```sql
CREATE TABLE IF NOT EXISTS agent_profile (
    id                  VARCHAR(64) PRIMARY KEY,
    user_id             BIGINT,
    display_name        VARCHAR(128) NOT NULL,
    description         VARCHAR(512),
    system_prompt_template TEXT NOT NULL,
    tool_allowlist_json JSONB NOT NULL DEFAULT '[]',
    model_override      VARCHAR(64),
    max_turns           INT NOT NULL DEFAULT 20,
    max_output_tokens   INT,
    skill_ids_json      JSONB NOT NULL DEFAULT '[]',
    is_system           BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_profile_user_id ON agent_profile (user_id);
```

- [ ] **Step 2: agent_run 扩展列**

```sql
ALTER TABLE agent_run ADD COLUMN IF NOT EXISTS parent_run_id UUID;
ALTER TABLE agent_run ADD COLUMN IF NOT EXISTS profile_id VARCHAR(64);
ALTER TABLE agent_run ADD COLUMN IF NOT EXISTS role_label VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_agent_run_parent_run_id ON agent_run (parent_run_id);
```

- [ ] **Step 3: Flyway 验证**

- [ ] **Step 4: 提交**

---

## Task T40: AgentProfileEntity + Repository

**Files:**
- Create: `.../entity/AgentProfileEntity.java`
- Create: `.../repository/AgentProfileRepository.java`
- Modify: `.../entity/AgentRunEntity.java`（加 parentRunId, profileId, roleLabel）

- [ ] **Step 1: Entity 字段与 JSON 列**

- [ ] **Step 2: Repository**

```java
List<AgentProfileEntity> findByUserIdOrIsSystemTrueOrderByDisplayNameAsc(Long userId);
Optional<AgentProfileEntity> findByIdAndIsSystemTrue(String id);
Optional<AgentProfileEntity> findByIdAndUserId(String id, Long userId);
```

- [ ] **Step 3: AgentRunRepository 加**

```java
List<AgentRunEntity> findByParentRunIdOrderByCreatedAtAsc(UUID parentRunId);
```

- [ ] **Step 4: 提交**

---

## Task T41: Flyway seed 4 profiles

**Files:**
- 同迁移文件末尾 INSERT 或 Java seed

- [ ] **Step 1: main-editor**

id=`main-editor`；allowlist=`[]`（空=全量）；max_turns=30；system prompt 占位「主编辑」

- [ ] **Step 2: chapter-writer**

allowlist: ReadChapter, WriteChapter, ListChapters, ReadMemory, ListMemory, SearchKnowledge, GetCharacterGraph

- [ ] **Step 3: continuity-reviewer**

allowlist: ReadChapter, ListChapters, SearchKnowledge, GetCharacterGraph, NarrativeReview（若有）

- [ ] **Step 4: style-editor**

allowlist: ReadChapter, EditChapter, ListChapters

- [ ] **Step 5: 提交**

---

## Task T42: AgentProfileService

**Files:**
- Create: `.../service/agent/AgentProfileService.java`
- Create: `.../dto/agent/AgentProfileDTO.java`

- [ ] **Step 1: getForRun(profileId, userId)**

system id 直接读；user clone 校验 owner

- [ ] **Step 2: list / create / update / delete**

用户不可删改 is_system；clone 时新 id=UUID 字符串

- [ ] **Step 3: resolveToolAllowlist(profile)**

空列表 → null（表示不限制）；非空 → 交集校验

- [ ] **Step 4: resolveSkillIds(profile)**

合并 profile.skill_ids → AgentSkillService.getForRun

- [ ] **Step 5: AgentProfileServiceTest**

- [ ] **Step 6: 提交**

---

## Task T43: AgentRun 持久化 parent/profile

**Files:**
- Modify: `novel-studio/studio-modules/studio-module-agent/.../AgentRunCoordinator.java` 或 persist 层
- Modify: `.../AssistantPersistCollector.java`（若 run 创建在此）

- [ ] **Step 1: 创建 sub-run 时写 parent_run_id + profile_id**

Python 回调或 Java 侧在收到 subagent started 事件时更新（查现有 sub-run 持久化路径）

- [ ] **Step 2: SSE subagent 事件带 profile_id**

扩展 python `subagent_sse.py` payload（Part 3）

- [ ] **Step 3: 集成测 parent/child 关系**

- [ ] **Step 4: 提交**

---

Part 1 完成 → [Part 2 — API + RunTree](./2026-06-26-agent-platform-p2-part2-java-api.md)
