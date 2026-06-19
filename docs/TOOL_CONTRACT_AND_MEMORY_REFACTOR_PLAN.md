# 工具契约对齐 + 记忆树重构 — 实施计划（替换式重构）

> **定位：这是一次重构替换，不是 v2 升级。**  
> 旧 story-memory（scope/key/value 扁平树、v1 信封、硬编码「身份/性格/摘要」）将**整体废弃**；  
> 新系统为 **`memory_node` 平表树** + **统一 Tool Contract** + **前端记忆树面板**。  
> 不做长期双轨；迁移脚本一次性导入后删除旧读写路径。

关联：`docs/AGENT_TOOLS.md`

---

## 1. 为什么要重构

| 问题 | 旧系统 | 新系统 |
|------|--------|--------|
| 字段名 | context 用 `id=`，工具用 `chapter_id` | 全栈统一 `chapter_id` / `memory_id` |
| 记忆结构 | 扁平 key + 强制 data 键 | **树节点**：`parent_id` + `sort_order` + 自由子标题 |
| 层级 UI | 键值卡片，无法表达世界观嵌套 | 树形面板 + **预设排版 style** |
| 工具参数 | Schema 全 optional → `{}` 合法 | Contract 驱动 required / oneOf |
| AI 写记忆 | 找不到槽位乱写 scope | `CreateMemory` 挂到 `parent_id`，叶子写 `content` |

---

## 2. 记忆树 — 产品模型

### 2.1 节点（唯一存储单元）

```
memory_id      UUID — 所有 CRUD 只认此 id
parent_id      null = scope 下根节点；Move 时修改
sort_order     同级展示顺序（用户阅读 + 前端渲染）
scope          novel | world | character | chapter | background
title          节点标题（任意层级，LLM 自定）
node_kind      section | leaf | both
content        Markdown 正文（叶子或 section 导语）
style          JSON — 前端排版预设（见 §3）
meta           JSON — linked_chapter_id 等
```

**无嵌套 JSON 文档**：层级只靠 `parent_id` 指针；PG 一行一节点。

### 2.2 示例：AI 写世界观

```
scope=world
[w1] sort=0 section+both  世界观          content=总述 MD
  [w2] sort=0 section      核心设定
    [w3] sort=0 leaf       魔法体系        content=## … + style=quote
    [w4] sort=1 leaf       科技水平        content=…
  [w5] sort=1 section      势力分布
    [w6] sort=0 leaf       三大宗门        content=…
```

### 2.3 工具（替换旧 6 工具，同名或新名待定）

| 工具 | 说明 |
|------|------|
| ListMemory | `scope`, 可选 `parent_id` — 列同级子节点 |
| GetMemoryTree | `scope` — RUN_CONTEXT 缩略树 |
| ReadMemory | **`memory_id`** |
| CreateMemory | `scope`, `title`, `parent_id?`, `content?`, `node_kind?`, **`style?`** |
| UpdateMemory | **`memory_id`**, 可选字段 |
| MoveMemory | **`memory_id`**, `parent_id`, `sort_order?` |
| DeleteMemory | **`memory_id`**, `cascade=true` 默认 |

**删除**：旧 `WriteMemory(scope,key,payload)`、`EditMemory(old_string)`、`ClearMemory` 整 scope 清空改为 Delete 根子树或管理端操作。

---

## 3. 排版预设 `style`（AI 选用 + 前端渲染）

权威定义：

- Python：`python-ai/app/agent/backend/memory_style_presets.py`（注入 prompt）
- 前端：`frontend/src/components/memory/memoryStylePresets.ts`（渲染）

| preset `layout` | 适用场景 | AI 选用建议 |
|-----------------|----------|-------------|
| **accordion** | 世界观/大纲多级 section | scope=world/novel 的根与子 section |
| **outline** | 深层嵌套、章节目录式 | 层级 ≥2 的 section |
| **cards** | 角色库、并列条目 | scope=character 子节点、并列设定 |
| **timeline** | 时间线、年表 | novel 大纲按时间组织 |
| **hero** | 单页重点、根节点总述 | scope 根节点 node_kind=both |
| **quote** | 短引用、金句设定 | leaf 且 content < 400 字 |
| **prose** | 长文 Markdown 默认 | leaf 正文（默认，可不传 style） |

可选字段：`variant`（default|emphasis|muted）、`icon`、`accent`、`collapse_default`、`show_content_inline`。

AI 规则（写入 system prompt）：

1. 新建 section → 优先 `layout: accordion` 或 `outline`
2. 新建 leaf 长文 → 省略 style 或 `{ "layout": "prose" }`
3. 并列角色卡 → `{ "layout": "cards", "variant": "emphasis" }`
4. 根节点有总述 → `{ "layout": "hero", "show_content_inline": true }`
5. **勿**传未文档化的 layout（前端回退 prose）

---

## 4. 前端记忆面板重构

### 4.1 目标

- 替换 `StoryMemoryModal` 内 flat `StoryMemoryGroup` 键值列表
- 按 **scope Tab** + **树形递归** 展示 `memory_node`
- 根据节点 `style.layout` 选择组件：`MemoryTreeView` 内 layout 分支
- 只读（Agent 写入）；刷新走 `GET …/memory-nodes/tree?scope=`

### 4.2 文件

| 路径 | 职责 |
|------|------|
| `types/memoryNode.ts` | MemoryNodeDTO、MemoryNodeStyle |
| `memory/memoryStylePresets.ts` | 预设 + `resolveNodePresentation()` |
| `memory/MemoryTreeView.tsx` | 递归树 UI |
| `memory/StoryMemoryModal.tsx` | Tab + TreeView |
| `hooks/useEditorStoryMemory.ts` | 拉 tree API |
| `utils/api.ts` | `getMemoryTree(novelId, scope)` |

### 4.3 切 cutover

- 面板**仅**读 `memory_node` API
- 旧 `GET story-memory` 扁平 JSON **不再**驱动 UI
- 迁移完成前空树显示 empty state（非回退旧 UI）

---

## 5. 工具契约（章节 + 记忆）

见 `python-ai/app/agent/harness/tool_contract.py`。

章节 RUN_CONTEXT 行：

```
index=1 | chapter_id=<uuid> | title=… | word_count=… | status=已写
```

记忆 RUN_CONTEXT 缩略：

```
scope=world
  [memory_id=w1] sort=0 section  世界观 (3 children)
```

---

## 6. 后端（novel-studio）

- [x] `V12__memory_node.sql`
- [x] Entity / Repository / Service / Controller
- [x] 旧 patch-by-key 写路径已禁用（返回 410 / badRequest）
- [x] **不做** memory_json 迁移（旧数据废弃，避免污染 memory_node）

Python Agent 工具已接入 memory-nodes HTTP。

---

## 7. 分期

### Phase A — 契约与展示（已完成）

- [x] Tool Contract + chapter catalog 字段对齐
- [x] memory_style_presets（Python + 前端）
- [x] 前端 MemoryTreeView + tree API 读取
- [x] Python Create/Read/Move/Delete 工具接 memory-nodes

### Phase B — Schema 硬约束（已完成）

- [x] ReadChapter oneOf JSON Schema（含 EditChapter / DeleteChapter）
- [x] UpdateMemory / MoveMemory / ReorderChapters oneOf
- [x] Contract 测试（oneOf schema + registry 全覆盖）
- [x] `TOOL_CONTRACTS` 覆盖 registry 全部 25 工具
- [x] `build_tool` 自动附加 contract 描述后缀

### Phase C — 切流（无迁移）

- [x] 不做 memory_json → memory_node 迁移（旧数据废弃）
- [x] Python/Java 旧 story-memory 读写 stub + 写路径拒绝
- [x] 删 Python memory_store / memory_schema / memory_document / memory_api_contract
- [x] 删前端 storyMemoryModel / 旧 agent memory API
- [x] V13 migration DROP `novel_story_memory` / `story_memory`
- [x] 删 Java StoryMemoryService / Entity / Repository / StoryMemoryClient（控制器 + AuthStoryMemoryBiz 410 壳保留）
- [x] 删 Python `memory_fields.py`（旧 flat patch 逻辑）

---

## 8. 测试

- Python：`test_tool_contract.py`、`test_memory_style_presets.py`
- 前端：`memoryStylePresets.test.ts`、`MemoryTreeView` 快照
- Java：MemoryNodeService 集成测试

---

## 附录：旧系统删除清单（Phase C）

- ~~`memory_schema.py` v1 信封校验~~（已删）
- ~~`StoryMemoryWire` / `normalizeStoryMemory` 扁平解析~~（前端已删）
- ~~`WriteMemory` / `EditMemory` Agent 工具~~（已替换为 CreateMemory 等）
- `novel_story_memory.memory_json` 表数据：**不迁移、不读取**；V13 已 DROP
