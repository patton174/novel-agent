# 故事记忆持久化 + Planner 可靠性修复

> 状态：已完成（2026-05-30）  
> 日期：2026-05-30  
> 关联：`2026-05-29-agent-step-orchestration-design.md`

## 1. 背景

### 1.1 问题

| 问题 | 影响 |
|------|------|
| 故事记忆存 Python 进程内存 | 重启即丢；前端记忆弹窗为空 |
| Java 组装上下文时 `storyMemory=""` | Planner 看不到已有记忆 |
| Planner LLM 失败走 `_heuristic_plan` 猜拳 | 该写记忆时去 output，行为不可预期 |
| Heuristic 不走 `_enrich_plan_result` | memory 字段不补全、小结 task 不一致 |

### 1.2 目标

1. **故事记忆持久化**：按 `userId + sessionId` 存 Redis（content 服务），重启可恢复。
2. **上下文贯通**：Java 组装 run 上下文时加载记忆；Python plan/step 均可读到 `story_memory`。
3. **Planner 只信模型**：LLM 失败 → 重试；仍失败 → 明确报错终止 run，**禁止**静默 heuristic 猜下一步。
4. **向后兼容**：单元测试仍可用内存 backend；API 路径不变（`/api/agent/memory/{sessionId}`）。

## 2. 架构

```
Frontend ──GET /api/agent/memory/{sessionId}──► PyAI ──► Content (Redis)
Agent memory_update ──► Python patch ──► Content (Redis)  [canonical store]
Java assemble context ──load──► Content ──► story_memory 文本注入 AgentRunContext
Planner ──LLM retry×3──► PlanResult ──► _enrich_plan_result（始终）
```

### 2.1 Redis Key

```
content:story-memory:{userId}:{sessionId}  → JSON
{
  "novel": {},
  "world": {},
  "characters": { "角色名": { "key": "value" } },
  "chapters": { "章节id": { "key": "value" } },
  "background": {}
}
```

### 2.2 Content API

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/content/sessions/{sessionId}/story-memory` | 读全量记忆 |
| POST | `/api/content/sessions/{sessionId}/story-memory/patch` | `{scope,key,value,item_id?}` |

Header：`X-User-Id`（与现有 content API 一致）

## 3. Planner 行为变更

### 3.1 删除（生产路径）

- `plan_after_think` 中 LLM 失败 → `_heuristic_plan` 的 fallback
- `_has_plan_context` 不足时 → heuristic

### 3.2 新增

- `_plan_with_llm_retry(req, max_attempts=3)`：指数退避重试
- 全部失败：`HTTPException(503, detail="plan failed after retries")`；Java 侧已有 catch → run 失败
- `agent_plan` 入口调用 `_enrich_context`（与 step executor 一致）
- Human prompt 增加：`上一步工具`、`上一步结果`

### 3.3 保留（仅测试/dev）

- `_heuristic_plan` 保留供 `test_agent_plan.py` 直接调用，**不**从 `plan_after_think` 进入

## 4. 执行步骤

| Phase | 内容 | 验收 |
|-------|------|------|
| P1 | Content Redis 存储 + API | curl GET/PATCH 可读写 |
| P2 | PyAI 代理 + 上下文注入 | assemble 后 context 含 story_memory |
| P3 | Python content backend | memory_update 后 Redis 有数据；重启 Python 仍在 |
| P4 | Planner 重试 + 去 heuristic | 测试通过；plan 失败返回 503 |
| P5 | 集成测试 + 文档 | pytest + 本 spec 标记完成 |

## 5. 非目标（后续）

- 多模型 endpoint 动态路由（用户提到的「换节点」）
- 记忆 MQ 异步写入
- PostgreSQL 冷存储
