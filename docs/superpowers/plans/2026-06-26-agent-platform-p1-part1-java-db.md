# P1 Part 1 — Skills Java 数据层

> 主索引：[2026-06-26-agent-platform-roadmap-index.md](./2026-06-26-agent-platform-roadmap-index.md)  
> 设计：[`specs/2026-06-26-agent-platform-roadmap-spec.md`](../specs/2026-06-26-agent-platform-roadmap-spec.md) §4.3  
> 下一分册：[Part 2 — API + Assembler](./2026-06-26-agent-platform-p1-part2-java-api.md)

**约定**：表放 `studio-module-content`（与 agent_session 同库）；包 `cn.novelstudio.module.content`；Java 21。

---

## Task T17: V26 迁移 agent_skill 表

**Files:**
- Create: `novel-studio/studio-modules/studio-module-content/src/main/resources/db/migration/V26__agent_skill.sql`

- [ ] **Step 1: SQL**

```sql
CREATE TABLE IF NOT EXISTS agent_skill (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         BIGINT,
    name            VARCHAR(64) NOT NULL,
    version         INT NOT NULL DEFAULT 1,
    description     VARCHAR(512),
    content         TEXT NOT NULL,
    tools_json      JSONB NOT NULL DEFAULT '[]',
    locale          VARCHAR(8) NOT NULL DEFAULT 'zh',
    is_system       BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_skill_user_name
    ON agent_skill (COALESCE(user_id, 0), name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agent_skill_user_id ON agent_skill (user_id);
```

- [ ] **Step 2: 本地 Flyway 验证**

`_restart-dev-stack.ps1` 或 `mvn -pl studio-module-content flyway:migrate`（若配置）

- [ ] **Step 3: 提交**

```bash
git commit -m "feat(skills): V26 agent_skill table"
```

---

## Task T18: AgentSkillEntity + Repository

**Files:**
- Create: `.../entity/AgentSkillEntity.java`
- Create: `.../repository/AgentSkillRepository.java`

- [ ] **Step 1: Entity**

字段对齐迁移；`@SQLRestriction("deleted_at IS NULL")` 软删；`toolsJson` 用 `@JdbcTypeCode(SqlTypes.JSON)`。

- [ ] **Step 2: Repository 方法**

```java
List<AgentSkillEntity> findByUserIdOrIsSystemTrueOrderByNameAsc(Long userId);
Optional<AgentSkillEntity> findByIdAndUserId(UUID id, Long userId);
Optional<AgentSkillEntity> findByNameAndUserId(String name, Long userId);
Optional<AgentSkillEntity> findByNameAndIsSystemTrue(String name);
List<AgentSkillEntity> findByIsSystemTrueOrderByNameAsc();
```

- [ ] **Step 3: 编译**

```bash
mvn -q -pl studio-modules/studio-module-content -am compile
```

- [ ] **Step 4: 提交**

---

## Task T19: AgentSkillService CRUD + 权限

**Files:**
- Create: `.../service/agent/AgentSkillService.java`
- Create: `.../dto/agent/AgentSkillDTO.java`
- Create: `.../dto/agent/CreateAgentSkillRequest.java`
- Create: `.../dto/agent/UpdateAgentSkillRequest.java`

- [ ] **Step 1: DTO 映射**

`AgentSkillDTO`: id, name, description, locale, isSystem, tools, version, content（详情接口才返 content）

- [ ] **Step 2: listForUser(userId)**

返回 `is_system=true` + `user_id=userId`，按 name 排序。

- [ ] **Step 3: create(userId, req)**

校验 name slug `^[a-z0-9-]{2,64}$`；content ≤ 32768；tools_json 数组；version=1。

- [ ] **Step 4: update(userId, id, req)**

仅本人非 system；乐观锁 version mismatch → 409。

- [ ] **Step 5: delete(userId, id)**

软删 `deleted_at=now()`；system 不可删。

- [ ] **Step 6: getForRun(userId, skillIds)**

最多 3 个 id/slug；system slug 或 user UUID；无权限 skip + log。

- [ ] **Step 7: sanitize content**

去掉 `<script`；保留 markdown。

- [ ] **Step 8: 提交**

---

## Task T20: Flyway seed 3 bundled skills

**Files:**
- Create: `.../db/migration/V26_1__agent_skill_seed.sql` 或合并进 V26 后独立 `V26b`（Flyway 版本号用 `V26_1` 若支持，否则 `V27` 仅 seed — **注意与 P2 V27 冲突，建议 seed 放 Java `@PostConstruct` 或 `V26__agent_skill.sql` 末尾 INSERT**）

- [ ] **Step 1: INSERT 三条 is_system=true**

slug: `fanqie-chapter-hook`, `sweet-romance-beat`, `mystery-cold-open`；content 占位（Part 5 替换正文）。

- [ ] **Step 2: 验证 SELECT count(*)=3**

- [ ] **Step 3: 提交**

---

## Task T21: AgentSkillService 单测

**Files:**
- Create: `.../service/agent/AgentSkillServiceTest.java`

- [ ] **Step 1: create 成功 + duplicate name 失败**

- [ ] **Step 2: getForRun 超 3 截断**

- [ ] **Step 3: 不能改 system skill**

- [ ] **Step 4: mvn test**

```bash
mvn -q -pl studio-modules/studio-module-content -Dtest=AgentSkillServiceTest test
```

- [ ] **Step 5: 提交**

---

Part 1 完成 → [Part 2 — REST + Assembler](./2026-06-26-agent-platform-p1-part2-java-api.md)
