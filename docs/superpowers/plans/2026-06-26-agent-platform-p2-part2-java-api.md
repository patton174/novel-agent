# P2 Part 2 — Agent Profile Java API + Run 树

> 上一分册：[Part 1 — DB](./2026-06-26-agent-platform-p2-part1-java-db.md)  
> 下一分册：[Part 3 — Python](./2026-06-26-agent-platform-p2-part3-python.md)

---

## Task T44: AgentProfileController REST

**Files:**
- Create: `.../agent/controller/AgentProfileController.java`
- Create: `.../internal/InternalAgentProfileController.java`

- [ ] **Step 1: 用户 API**

| 方法 | 路径 |
|------|------|
| GET | `/api/agent/profiles` |
| GET | `/api/agent/profiles/{id}` |
| POST | `/api/agent/profiles` |
| PUT | `/api/agent/profiles/{id}` |
| DELETE | `/api/agent/profiles/{id}` |

- [ ] **Step 2: Internal GET /internal/agent/profiles/{id}**

返回完整 profile + resolved skills 摘要

- [ ] **Step 3: MockMvc 测试**

- [ ] **Step 4: 提交**

---

## Task T45: AgentRunTreeService + GET /runs/{id}/tree

**Files:**
- Create: `.../service/agent/AgentRunTreeService.java`
- Modify: `.../controller/AgentSessionController.java` 或新建 `AgentRunController.java`

- [ ] **Step 1: RunTreeNode DTO**

```java
record RunTreeNode(
    UUID runId,
    String profileId,
    String roleLabel,
    String status,
    Instant startedAt,
    Instant endedAt,
    List<RunTreeNode> children
) {}
```

- [ ] **Step 2: buildTree(rootRunId, userId)**

校验 run 归属 user；BFS/DFS 加载 parent_run_id 子节点

- [ ] **Step 3: GET /api/agent/runs/{runId}/tree**

- [ ] **Step 4: 单测 mock repository**

- [ ] **Step 5: 提交**

---

## Task T46: AgentStreamRequest profile hint（可选）

**Files:**
- Modify: `AgentStreamRequest.java` — 可选 `defaultProfileId`（主 run 一般不用）

- [ ] **Step 1: 仅文档化：profile 由 Agent 工具入参 profile_id 指定**

- [ ] **Step 2: 若需主 run 默认 profile：Assembler 写 context.default_profile_id**

- [ ] **Step 3: 提交（可与 T44 合并）**

---

Part 2 完成 → [Part 3 — Python SubAgent](./2026-06-26-agent-platform-p2-part3-python.md)
