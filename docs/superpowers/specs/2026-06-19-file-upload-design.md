# 模块 5：本地文件上传 — 设计文档（主册）

> 范围：通用文件上传层 + 服务书库业务（解析常见格式为纯文本/章节，写入书库目录）。
> 本文件含 §1–§4；§5–§7 见 [2026-06-19-file-upload-design-part2.md](./2026-06-19-file-upload-design-part2.md)。
> 状态：已通过 brainstorming 全部 7 节确认，待用户复核后转 writing-plans。

## 背景与目标

当前服务端**零文件上传能力**：novel-studio（Java）无 multipart 端点、无存储层；python-ai 无 `UploadFile`；前端仅编辑器 client-side 导入 txt/md（`EditorStoryPanel.tsx:75-103`，不经网络）。

"书库"现存概念是**爬虫公共目录**（`crawl_catalog_novel/chapter`），`addToUserLibrary` 是克隆成用户小说，不支持用户上传。

本模块交付：
1. 通用文件上传 + 存储抽象（本地磁盘实现）+ 元数据管理
2. 常见格式（txt/md/epub/pdf/docx）解析为纯文本/章节
3. 解析结果写入书库目录，复用 `crawl_catalog_*` + owner 隔离（公共/私人）
4. 用户私人书库上传数量受套餐配额限制

**不做什么（YAGNI）**：RAG 向量索引（留模块 1/4）、扫描型 PDF OCR、对象存储实现（接口预留）、上传书全文检索、解析进度 SSE。

## 现状关键事实

- 存储：无对象存储/MinIO 配置；`infra/` 仅 PG/Redis/RabbitMQ/Milvus
- 异步基建：RabbitMQ 在用，爬虫走 `agent.crawl.dispatch.queue` + `CrawlDispatchListener`（studio-module-worker）模式
- 书库表：`crawl_catalog_novel`(id,job_id,title,author,description,source_url,cover_url,chapter_count,created_at,updated_at) / `crawl_catalog_chapter`(id,catalog_novel_id,title,content,sort_order,source_url,word_count,created_at) —— 见 `V2__baseline_content.sql:185-209`
- 配额体系：`plan_feature`(plan_id,feature_key,enabled) 仅布尔；`user_quota_override`(token_bonus,run_bonus,rate_limit_rpm,expires_at)；`FeatureGateBiz.assertFeature` 查 enabled；`EffectiveQuotaSupport.resolve` 汇总 plan+override
- 鉴权：`X-User-Id` 由后端 filter 从 JWT 注入（前端不持有）；CRM 端点管理员鉴权；python `/internal/*` 走 `X-Internal-Service-Key`
- python-ai LLM/配置：纯 env var（`config.py`），本模块解析层不依赖 LLM

## §1 架构总览

### 编排方式：同步上传 + 异步解析（走 MQ）

```
[ Frontend ]                      [ novel-studio :8080 ]                 [ python-ai :8000 ]
  上传 UI ──multipart──→  AuthUploadController                        /internal/parse
   (轮询状态/进度)         ├ 鉴权 + 配额检查(plan_feature)                (txt/md/epub/pdf/docx
                          ├ StorageBackend.save() → 本地磁盘             → 纯文本/章节结构
                          ├ 写 uploaded_file(status=pending)  ←──MQ─── FileParseMessage
                          └ 返回 file_id                        ↓
                                                              FileParseListener (worker)
                                                              ├ 调 PythonParseClient POST /internal/parse
                                                              ├ 写 crawl_catalog_novel (owner_id, source=upload)
                                                              ├ 写 crawl_catalog_chapter
                                                              └ uploaded_file.status=ready (Redis 进度→100%)
```

### 分层职责

| 组件 | 所在 | 职责 |
|------|------|------|
| `StorageBackend`（接口） | novel-studio platform | `save(InputStream,key)/load(key)/delete(key)/exists(key)`。默认 `LocalDiskStorageBackend`（根目录 `app.upload.storage-dir`，按 `yyyy/MM/dd/` 分层）。后续可插拔 MinIO |
| `UploadController` | novel-studio content | auth + crm 两套 multipart 端点；鉴权、配额检查、落盘、写元数据、发 MQ |
| `UploadService` | novel-studio content | 编排：落盘、写元数据、触发解析、查状态/进度、列表、删除 |
| `FileParseMessage` / `FileParseListener` | novel-studio platform/worker | MQ 消息 + 消费者：调 python 解析 → 回写 catalog → 更新状态 |
| `PythonParseClient` | novel-studio content | `POST /internal/parse`（传文件字节流） |
| `/internal/parse` + `app/parse/*` | python-ai | 按格式分发解析器，返回纯文本/章节结构，写 Redis 进度 |
| `UploadedFileEntity` + Repo | novel-studio content | 文件元数据持久化 |

### 异步执行：MQ（RabbitMQ）

与爬虫 `CrawlDispatchListener` 同构，复用现有 RabbitMQ 基建：

- 新增 `MqTopic.FILE_PARSE` = `agent.file.parse.queue`，配 DLX `agent.file.parse.dlq`（重试上限 3，指数退避）
- `FileParseMessage`：`{ fileId, userId, ownerType(user/admin), storageKey, format, originalName }`
- `FileParseListener`（studio-module-worker）消费 → 调 python-ai → 回写 catalog + 状态
- 前端轮询 `GET /upload/files/{id}` 取 status + progress（Redis），不引入 SSE

### 与书库目录的关系

复用 `crawl_catalog_novel/chapter`，新增字段区分来源与归属：
- `owner_id`：null=公共（管理员上传/爬虫）；user_id=私人书库
- `source`：`crawl`（爬虫）/ `upload`（上传）
- `uploader_file_id`：指向 `uploaded_file.id`（upload 来源），并加唯一约束保证 MQ 重试不重复入 catalog

现有 `addToUserLibrary`（克隆成用户小说，进 novel/chapter）对 upload 来源同样适用。

## §2 数据模型

### 新增表 `uploaded_file`（文件元数据，通用上传层）

```sql
CREATE TABLE uploaded_file (
    id               VARCHAR(36) PRIMARY KEY,          -- file_id
    owner_id         VARCHAR(36),                       -- null=公共/管理员; user_id=私人
    owner_type       VARCHAR(16) NOT NULL,              -- 'user' | 'admin'
    original_name    VARCHAR(255) NOT NULL,
    storage_key      VARCHAR(512) NOT NULL,             -- 相对路径 key (yyyy/MM/dd/uuid.ext)
    mime_type        VARCHAR(128),
    size_bytes       BIGINT NOT NULL,
    format           VARCHAR(16) NOT NULL,              -- txt|md|epub|pdf|docx
    status           VARCHAR(16) NOT NULL,              -- pending|parsing|ready|failed
    parse_error      TEXT,                              -- failed 时的错误信息
    catalog_novel_id VARCHAR(36),                       -- 解析成功后指向 crawl_catalog_novel.id
    created_at       TIMESTAMPTZ NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_uploaded_file_owner ON uploaded_file (owner_id, owner_type);
CREATE INDEX idx_uploaded_file_status ON uploaded_file (status);
```

状态机：`pending`(0%) → `parsing`(进度%) → `ready`(100%) / `failed`。
（进度值存 Redis `parse:progress:{fileId}`，不入库；详见 §5）

### 扩展 `crawl_catalog_novel`（加 owner/source/uploader_file_id）

```sql
ALTER TABLE crawl_catalog_novel
  ADD COLUMN owner_id         VARCHAR(36),                       -- null=公共; user_id=私人书库
  ADD COLUMN source           VARCHAR(16) NOT NULL DEFAULT 'crawl',  -- 'crawl' | 'upload'
  ADD COLUMN uploader_file_id VARCHAR(36);                       -- 指向 uploaded_file.id（upload 来源）
CREATE INDEX idx_catalog_novel_owner ON crawl_catalog_novel (owner_id, source);
-- uploader_file_id 唯一约束：MQ 重试不重复入 catalog
CREATE UNIQUE INDEX uq_catalog_novel_uploader_file ON crawl_catalog_novel (uploader_file_id)
  WHERE uploader_file_id IS NOT NULL;
```

`crawl_catalog_chapter` 不变（章节内容同构，爬虫/上传共用）。

### 扩展 `plan_feature`（加 limit_value，通用限额值列）

```sql
ALTER TABLE plan_feature ADD COLUMN limit_value INT;  -- null=不适用/布尔特性; 数值=限额
```
Seed `library_upload_limit`（私人书库上传数量上限）：
```sql
INSERT INTO plan_feature (plan_id, feature_key, enabled, limit_value) VALUES
  (hobby_id,      'library_upload_limit', true,  5),
  (pro_id,        'library_upload_limit', true,  50),
  (enterprise_id, 'library_upload_limit', true,  NULL);  -- NULL = 无限
```

### 扩展 `user_quota_override`（加上传额度 bonus）

```sql
ALTER TABLE user_quota_override ADD COLUMN library_upload_bonus INT;  -- 管理员临时加额度
```
`EffectiveQuotaSupport.resolve` 汇总时纳入。

### 实体/Repo

- `UploadedFileEntity` + `UploadedFileRepository`
- `CrawlCatalogNovelEntity` 扩展 3 字段 + 对应 getter/setter
- `PlanFeatureEntity` 扩展 `limitValue`
- `UserQuotaOverrideEntity` 扩展 `libraryUploadBonus`

## §3 API 契约

### Java 端点（novel-studio）

**用户上传（私人书库）**
```
POST /api/content/auth/upload/file        (multipart/form-data)
  - file: 文件
  - (可选) title: 覆盖标题
  鉴权(X-User-Id) → 配额检查(plan_feature.library_upload_limit)
  → 落盘 → 写元数据(pending) → publish ParseFileMessage
  → 返回 { fileId, status:"pending" }
  超配额 → 409 { error:"LIBRARY_UPLOAD_LIMIT_EXCEEDED", limit, used }
  超大小 → 413；格式不支持 → 400
```

**管理员上传（公共书库）**
```
POST /api/content/crm/upload/file         (multipart/form-data, CRM 鉴权)
  同上，owner_type=admin, owner_id=null；不受配额限制
```

**查询/管理（用户）**
```
GET    /api/content/auth/upload/files?status=&page=&size=   列表（按 owner_id=自己 隔离）
GET    /api/content/auth/upload/files/{fileId}              详情（status, progress, catalogNovelId, parseError）
DELETE /api/content/auth/upload/files/{fileId}              删除（物理文件 + 元数据；已解析 catalog 保留）
POST   /api/content/auth/upload/files/{fileId}/retry        重新 publish 解析消息（status=failed 时）
```
管理员对应 `/api/content/crm/upload/files*`（可查全部、不限 owner）。

**配额查询**
```
GET /api/content/auth/upload/quota   → { limit, used, remaining }   (limit=null 时 remaining=null 表示无限)
```

### python-ai 端点

```
POST /internal/parse   (X-Internal-Service-Key 鉴权, multipart)
  请求: file=<bytes>, format=<txt|md|epub|pdf|docx>, originalName, fileId
  响应: { title, chapters:[{title,content,sort_order}], text }
  错误: { error:"unsupported_format"|"parse_failed"|"pdf_scan_unsupported", detail? }
```

**存储共享**：Java 传文件字节流给 python（multipart），不依赖共享文件系统。理由：本地磁盘不保证 python-ai 与 novel-studio 同机（生产可能分 pod），共享挂载是运维负担；文件已落盘，Java 读回再传 python，解析本身才是耗时部分，二次传输在可接受范围。

python 解析时按 fileId 写 Redis 进度 `parse:progress:{fileId}`（百分比，TTL 1h）。

### 响应语义

- `chapters` 非空 → 按章节入 `crawl_catalog_chapter`
- 仅 `text` → 整体作单章节入库
- `error` → Java 置 `uploaded_file.status=failed` + `parse_error`，进度不清

### 鉴权与隔离

- 用户端点：`X-User-Id`（filter 注入）→ 只能看/删/重试自己的 `owner_id=userId` 文件
- 管理员端点：CRM 鉴权 → 可操作公共（owner_id=null）与全部
- 删除策略：删 `uploaded_file` + 物理文件；**已解析写入 `crawl_catalog_*` 的内容保留**（用户可能已 addToLibrary 到小说）。仅删上传元数据与物理文件，不级联 catalog。

## §4 配额机制

### plan_feature.limit_value + override.library_upload_bonus

限额 = `plan.library_upload_limit(limit_value)` + Σ `overrides.library_upload_bonus`
- 任一为 null 视为无限（enterprise plan limit_value=null → 无限）
- `EffectiveQuotaSupport.resolve` 汇总 plan + override，新增 `resolveLibraryUploadLimit(userId)` 返回 `Integer`（null=无限）

### 查询限额

`FeatureGateBiz` 现有 `assertFeature` 只查 `enabled`。新增方法取 `limit_value`：
```java
Integer getFeatureLimit(userId, "library_upload_limit")  // 解析 plan + override，null=无限
```

### 配额检查逻辑（上传前）

```
limit = resolveLibraryUploadLimit(userId)           // null=无限
used  = count(uploaded_file
              WHERE owner_id=userId AND owner_type='user'
                AND status IN ('pending','parsing','ready'))
if limit != null && used >= limit → 拒绝 409 LIBRARY_UPLOAD_LIMIT_EXCEEDED
```
**`failed` 状态不计入已用配额**（失败上传不占名额，用户可重试或删除）。

### 端点

`GET /api/content/auth/upload/quota` 返回 `{ limit, used, remaining }`（limit=null 时 remaining=null）。

管理员上传（公共书库）不受配额限制。

---
§5 python 解析层 / §6 前端 / §7 安全·测试·迁移·文件清单 见
[part2](./2026-06-19-file-upload-design-part2.md)。
