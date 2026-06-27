# Agent Skills 平台化设计（Web 单一数据源）

> 2026-06-26 · **不再在代码/仓库中维护 Skill 正文**

## 原则

1. **运行时唯一数据源**：PostgreSQL `agent_skill` 表。
2. **官方库 vs 用户库**：`is_system=true`（平台运营在 Admin 维护）与 `user_id`（用户在 Dashboard 自建）共存；slug 解析时 **系统优先**。
3. **Web 管理**：官方 Skill 在 `/admin/system/agent-skills` CRUD；用户 Skill 在 `/dashboard/skills` CRUD（系统 Skill 只读）。
4. **Python/Java 只读 API**：`GET /internal/agent/skills/{id|slug}`、`POST /internal/agent/skills/resolve`。
5. **版本快照**：用户引用官方 Skill 默认 **固定 pinned_version**；Admin 更新前写入 `agent_skill_revision`；用户可手动更新或开启自动更新。

## 数据模型

### `agent_skill`（现有）

| 字段 | 官方库 | 用户库 |
|------|--------|--------|
| `user_id` | NULL | 用户 ID |
| `is_system` | true | false |
| `name` | 全局 slug | 用户内唯一 slug |
| `version` | Admin 每次保存 +1 | 乐观锁更新 |
| `content` | Markdown 指令正文 | 同左 |

### `agent_skill_revision`（V29）

Admin 升级官方 Skill 前，将当前 version 的快照写入此表。

### `user_skill_ref`（V29）

| 字段 | 说明 |
|------|------|
| `user_id` + `skill_id` | 用户对官方 Skill 的引用 |
| `pinned_version` | 用户当前使用的版本 |
| `auto_update` | `true` 跟随最新；`false` 读 revision 快照 |

## API 面

| 受众 | 前缀 | 能力 |
|------|------|------|
| 用户 | `/api/agent/skills` | CRUD 自定义；列表含官方 + pin 元数据 |
| 用户 | `POST/PATCH /api/agent/skills/{id}/ref` | 固定版本 / 拉取最新 / 切换自动更新 |
| 管理员 | `/api/admin/agent/skills` | 官方库 CRUD |
| python-ai | `/internal/agent/skills/*` | 按 pin 解析 content |

## 前端

| 页面 | 路径 | 说明 |
|------|------|------|
| 我的 Skills | `/dashboard/skills` | 官方行：版本对比、更新、自动更新 |
| 官方 Skills 库 | `/admin/system/agent-skills` | Admin 维护 |
| 编辑器 `#` 选择 | SkillPicker | 选用时 `POST ref` 固定版本；显示更新提示 |

## 已删除的废弃项

- `python-ai/skills/bundled/`、`catalog.json`、`scripts/sync-system-skills.py`
- `skill_catalog.py`、Python bundled fallback、`POST /internal/agent/skills/sync`

## 升级官方 Skill

1. Admin 保存 → 旧 version 进 `agent_skill_revision` → `agent_skill.version` +1
2. 未开自动更新的用户看到 `update_available`，可手动拉取最新
