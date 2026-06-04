# 小说中心化框架设计

## 摘要

将 Editor 从「对话为中心」升级为「小说为中心」：左侧展示小说列表及其会话历史，右侧展示当前小说的章节列表，中间为 AI 聊天与章节正文编辑。小说元数据（名称、描述、目标章节字数等）作为 Agent 上下文注入；AI 通过 SSE 流式工具对章节增删查改。

## 布局

```
┌──────────────────┬─────────────────────────────┬──────────────────┐
│ 左栏 (260px)      │ 中栏 (flex)                  │ 右栏 (280px)      │
├──────────────────┼─────────────────────────────┼──────────────────┤
│ 小说列表          │ Tab: 聊天 | 章节编辑          │ 章节大纲列表      │
│  └ 会话历史       │ 聊天: Agent SSE 时间线        │ 点击切换当前章    │
│ 新建小说          │ 编辑: 正文 textarea + 保存     │ 新增章节          │
└──────────────────┴─────────────────────────────┴──────────────────┘
```

## 数据模型

### novel（PostgreSQL）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | BIGINT | 所属用户 |
| title | VARCHAR | 小说名 |
| description | TEXT | 简介/设定 |
| genre | VARCHAR | 类型（可选） |
| style | VARCHAR | 风格（可选） |
| target_chapter_words | INT | 目标章节字数 |
| created_at / updated_at | TIMESTAMP | |

### chapter（PostgreSQL）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| novel_id | UUID | 外键 |
| title | VARCHAR | 章节标题 |
| content | TEXT | 正文 |
| summary | TEXT | 摘要（可选） |
| sort_order | INT | 排序 |
| word_count | INT | 字数 |

### session（Redis，扩展）

- 新增 `novelId` 字段，会话归属小说
- `GET /api/content/novels/{novelId}/sessions` 按小说过滤

## API（content 服务 :8091）

- `GET/POST /api/content/novels`
- `GET/PUT/DELETE /api/content/novels/{novelId}`
- `GET/POST /api/content/novels/{novelId}/chapters`
- `GET/PUT/DELETE /api/content/chapters/{chapterId}`

## Agent 上下文注入（Java PyAI）

`AgentContextAssembler` 根据 `novelId` + `chapterId` 组装：

```json
{
  "project": { "id", "title", "description", "genre", "style", "target_chapter_words" },
  "chapter": { "id", "title", "content", "summary", "word_count" },
  "chapters": [{ "id", "title", "sort_order", "word_count" }],
  "text": "<当前章节正文>",
  "history": [...],
  "preferences": { "mode", "think_mode", ... }
}
```

## Agent 工具（Python，全部 SSE）

| 工具 | 类型 | 行为 |
|------|------|------|
| chapter_list | 确定性 | 列出章节摘要，display.type=tool |
| chapter_read | 确定性 | 读取指定章节正文 |
| chapter_create | LLM+副作用 | 创建章节，context_patch.chapter_create |
| chapter_update | LLM 流式 | 更新章节正文，context_patch.chapter_update |
| chapter_delete | 确定性 | 删除章节，context_patch.chapter_delete |
| write | 已有 | 续写时写入当前章节 |

Java `ChapterSideEffectHandler` 在步进完成后解析 `context_patch` 并调用 content REST 持久化。

## 前端状态

- `novelStore`（Zustand）：novels、activeNovelId、chapters、activeChapterId、sessions
- Agent 请求携带 `novel_id`、`chapter_id`、`context_text`（当前章正文）
- 章节编辑区手动保存 → `PUT /api/content/chapters/{id}`

## 非目标（后续）

- 大纲拖拽撤销/重做

---

## Phase 7（已实现）

### 分卷拖拽排序
- `POST /api/content/novels/{novelId}/volumes/reorder` — 批量更新卷 `sortOrder`
- 右栏卷标题栏 `⋮⋮` 手柄，拖拽到其他卷位置即可排序

### 跨卷移动章节
- `POST /api/content/volumes/{volumeId}/chapters/reorder` — 设定卷内章节顺序，并可将其他卷章节移入
- 拖拽章节到目标卷或目标章节上方；空卷显示「拖拽章节到此处」投放区
- 同卷内拖拽可调整章节顺序

---

## Phase 6（已实现）

### 多卷结构（卷 → 章）
- PostgreSQL 表 `volume`；`chapter.volume_id` 外键字段
- API：
  - `GET/POST /api/content/novels/{novelId}/volumes`
  - `PUT/DELETE /api/content/volumes/{volumeId}`
  - 创建章节可传 `volumeId`；旧数据自动迁移到「第一卷」
- Agent 上下文注入 `volumes` + 章节 `volume_id` / `volume_title`
- `chapter_list` 工具按卷分组展示
- 前端右栏按卷折叠展示章节，支持「新增卷 / 本卷新增章节」

---

## Phase 2（已实现）

### 会话按小说隔离
- `StoredChatSession.novelId` + `listSessionsByNovel`
- 前端切换小说时调用 `GET /api/content/novels/{id}/sessions`  hydrate
- 新建对话 / upsert 携带 `novelId`

### AI 写完后同步编辑器
- `run.completed` / `message.completed` → `reloadActiveChapterContent()`（未手动编辑时）
- `tool.completed`（write/chapter_*）→ 刷新章节列表与正文

### 上下文检索
- `GET /api/content/novels/{id}/search?q=` — PostgreSQL 全文 LIKE 检索
- Agent 工具 `context_search`（SSE）：本地上下文 + 远程章节检索 + Milvus 降级
- Planner 启发式：含「搜索/伏笔/之前」等关键词时先 `context_search`

---

## Phase 3（已实现）

### 章节版本历史
- 表 `chapter_version`：正文/标题变更前自动快照
- `GET /api/content/chapters/{id}/versions`
- `POST /api/content/chapters/{id}/versions/{versionId}/restore`
- AI 写入请求头 `X-Edit-Source: ai`，来源标记 user / ai / restore

### RAG 向量索引
- `POST /api/rag/index/chapter` — 分块 embedding（OpenAI 或 hash 降级）
- 内存索引默认启用；Milvus 可用时自动双写
- content 服务章节变更后异步通知 Python 重建索引
- `vector_search` / `context_search` 使用向量相似度结果

### 切换小说自动选中最近会话
- 切换小说 → 同步远程会话 → 自动进入最新会话
- 无会话且当前 session 不属于该小说 → 自动新建对话

---

## Phase 4（已实现）

### 版本历史 UI
- 右栏 `ChapterVersionPanel`：版本列表、一键恢复

### 异步批量重建 RAG 索引
- `POST /api/content/novels/{id}/reindex` 立即返回任务（202）
- `GET /api/content/novels/{id}/reindex/status` 轮询进度
- 前端按钮显示 `重建中 X/Y`

---

## Phase 5（已实现）

### 版本 diff 预览
- 版本项「预览差异」：按行对比历史版本与当前编辑器正文
- 绿色 `+` 表示恢复后将新增，红色 `-` 表示将删除
- 标题变更单独展示；完全一致时提示「与当前正文一致」
