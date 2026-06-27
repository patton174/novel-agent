# P1 Part 2 — Skills Java API + Assembler

> 上一分册：[Part 1 — DB](./2026-06-26-agent-platform-p1-part1-java-db.md)  
> 下一分册：[Part 3 — Python](./2026-06-26-agent-platform-p1-part3-python.md)

---

## Task T22: AgentSkillController REST

**Files:**
- Create: `novel-studio/studio-modules/studio-module-agent/src/main/java/cn/novelstudio/module/agent/controller/AgentSkillController.java`
- Create: `.../service/biz/AgentSkillBiz.java`（薄封装，或直接调 content AgentSkillService）

> Agent 模块依赖 content AgentSkillService（确认 pom dependency）。

- [ ] **Step 1: 路由**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/agent/skills` | 列表（无 content） |
| GET | `/api/agent/skills/{id}` | 详情含 content |
| POST | `/api/agent/skills` | 创建 |
| PUT | `/api/agent/skills/{id}` | 更新 |
| DELETE | `/api/agent/skills/{id}` | 软删 |

JWT 鉴权：`X-User-Id` 或 SecurityContext（与 AgentSessionController 一致）。

- [ ] **Step 2: Result 包装 + ResultLocalizer**

错误码：`SKILL_NOT_FOUND`, `SKILL_FORBIDDEN`, `SKILL_NAME_TAKEN`, `SKILL_CONTENT_TOO_LARGE`

- [ ] **Step 3: 集成测 MockMvc**

`AgentSkillControllerTest`: GET list 200, POST create 201

- [ ] **Step 4: 提交**

```bash
git commit -m "feat(skills): REST /api/agent/skills CRUD"
```

---

## Task T23: InternalAgentSkillController

**Files:**
- Create: `.../controller/internal/InternalAgentSkillController.java`

- [ ] **Step 1: GET /internal/agent/skills/bundled**

返回 system skills 列表 `{id,name,description,content,tools,locale}`

- [ ] **Step 2: GET /internal/agent/skills/{idOrSlug}**

`ClientAuthSupport.isTrustedService` 校验 internal key

- [ ] **Step 3: POST /internal/agent/skills/resolve**

Body: `{ "user_id": 1, "skill_ids": ["uuid","fanqie-chapter-hook"] }`  
返回合并后的 `{ skills: [...], merged_prompt: "..." }` 供 python 可选调用（Assembler 为主路径）

- [ ] **Step 4: 提交**

---

## Task T24: AgentStreamRequest 加 skillIds

**Files:**
- Modify: `.../dto/agent/AgentStreamRequest.java`
- Modify: `frontend/src/types/agent.ts`（Part 4 同步）

- [ ] **Step 1: record 末尾加**

```java
    List<String> skillIds
```

- [ ] **Step 2: Jackson 缺省 null 兼容旧客户端**

- [ ] **Step 3: 编译（预期 RunState 未映射，T26 修）**

- [ ] **Step 4: 提交（与 T25–T26 合并）**

---

## Task T25: AgentContextAssembler skill 注入

**Files:**
- Modify: `.../service/AgentContextAssembler.java`

- [ ] **Step 1: 注入 AgentSkillService**

- [ ] **Step 2: buildContext 内**

```java
List<Map<String, Object>> skills = new ArrayList<>();
List<String> ids = request.skillIds();
if (ids != null && !ids.isEmpty()) {
    List<AgentSkillEntity> resolved = agentSkillService.getForRun(userId, ids.stream().limit(3).toList());
    StringBuilder merged = new StringBuilder();
    for (AgentSkillEntity s : resolved) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId().toString());
        m.put("name", s.getName());
        m.put("description", s.getDescription());
        skills.add(m);
        merged.append("\n\n## Skill: ").append(s.getName()).append("\n");
        merged.append(truncate(s.getContent(), 4000));
    }
    context.put("skill_ids", skills.stream().map(x -> x.get("id")).toList());
    context.put("skill_prompt", merged.toString().strip());
}
```

- [ ] **Step 3: 空 skillIds 时不写键**

- [ ] **Step 4: 提交**

---

## Task T26: AgentRunContextDto + AgentRunState 映射

**Files:**
- Modify: `.../dto/agent/AgentRunContextDto.java`
- Modify: `.../orchestration/AgentRunState.java`
- Modify: `.../service/RunColdFailoverContextBuilder.java`（若有 context 重建）

- [ ] **Step 1: Dto 加字段**

```java
    List<Map<String, Object>> skillIds,  // 元数据
    String skillPrompt
```

- [ ] **Step 2: toContextDto 从 assembledContext 读取**

- [ ] **Step 3: Failover builder 同步**

- [ ] **Step 4: mvn compile + test AgentRunState**

- [ ] **Step 5: 提交**

```bash
git commit -m "feat(skills): AgentStreamRequest skillIds + Assembler inject skill_prompt"
```

---

Part 2 完成 → [Part 3 — Python](./2026-06-26-agent-platform-p1-part3-python.md)
