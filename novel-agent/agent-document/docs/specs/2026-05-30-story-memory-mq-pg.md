# 故事记忆 MQ 异步写入 + PostgreSQL 冷存储

> 状态：已完成（2026-05-30）  
> 日期：2026-05-30  
> 前置：`2026-05-30-story-memory-planner-fix.md`（Redis 热存储已完成）

## 1. 目标

| 层级 | 职责 |
|------|------|
| Redis | 热缓存，patch/get 同步读写，低延迟 |
| RabbitMQ | patch 后异步投递全量快照，解耦写 PG |
| PostgreSQL | 冷存储权威副本，Redis 丢失/重启后可恢复 |

## 2. 数据流

```
PATCH story-memory
  → StoryMemoryService.patchMemory
  → 写 Redis（同步）
  → 发 MQ { user_id, session_id, memory }
  → 立即返回

Consumer StoryMemoryListener
  → POST /internal/persist
  → StoryMemoryService.persistCold → UPSERT PG

GET story-memory
  → Redis hit → 返回
  → Redis miss → 读 PG → 回填 Redis → 返回
```

## 3. PostgreSQL

表 `story_memory`：

| 列 | 类型 | 说明 |
|----|------|------|
| user_id | BIGINT | PK 之一 |
| session_id | VARCHAR(64) | PK 之一 |
| memory_json | TEXT | 与 Redis JSON 结构一致 |
| updated_at | TIMESTAMPTZ | 最后写入时间 |

## 4. MQ

| 项 | 值 |
|----|-----|
| Topic | `STORY_MEMORY` |
| Exchange | `agent.story-memory.exchange` |
| RoutingKey | `agent.story-memory.persist` |
| Queue | `agent.story-memory.queue` |

## 5. API 变更

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/content/sessions/{sessionId}/story-memory/internal/persist` | Consumer 专用，全量落 PG |

## 6. 验收

- patch 后 Redis 立即可读；Consumer 日志显示 PG 已写入
- 清空 Redis key 后 GET 仍能从 PG 恢复并回填
- MQ 不可用时 patch 仍成功（仅 Redis），日志 warn
