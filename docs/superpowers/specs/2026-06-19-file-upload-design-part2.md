# 模块 5：本地文件上传 — 设计文档（分册 2）

> 本文件含 §5–§7；§1–§4 见 [2026-06-19-file-upload-design.md](./2026-06-19-file-upload-design.md)。

## §5 python-ai 解析层

### 路由

新路由 `app/api/parse_routes.py`，注册到 `main.py`：
```
POST /internal/parse   (X-Internal-Service-Key 鉴权, multipart)
  请求: file=<bytes>, format, originalName, fileId
  响应: { title, chapters:[{title,content,sort_order}], text }
  错误: { error:"unsupported_format"|"parse_failed"|"pdf_scan_unsupported", detail? }
```

### 解析器分发（`app/parse/`）

```
parse/
  dispatcher.py    # 按 format 分发；写 Redis 进度 parse:progress:{fileId}
  text_parser.py   # txt/md: 直接读，md 去 markdown 语法符号
  epub_parser.py   # zipfile 解压 → 按 spine 顺序读 XHTML → 提纯文本
  pdf_parser.py    # pypdf 抽文本（仅文本型）
  docx_parser.py   # zipfile 解压 word/document.xml → 提取 <w:t> 文本
```

### 章节切分策略

| 格式 | 切分 | 标题来源 |
|------|------|----------|
| epub | 每个 XHTML spine 项作为一章 | `<h1>`/`<title>` 或"第 N 章" |
| docx/pdf/txt/md | 标题启发式正则切分（`第.{1,8}章` / `Chapter \d+` / Markdown `#`） | 切分点文本 |
| 切不出 | 整体作单章 | 文件名/title |

输出统一：有章节走 `chapters`，否则走 `text`（Java 端单章入库）。

### 进度回报（Redis）

python-ai 引入 Redis 依赖（`redis>=5.0`）+ 配置 `REDIS_URL`（默认 `redis://127.0.0.1:6379/0`，复用 CN 开发中间件 118.89.123.201:16379）。新建 `app/core/redis_client.py` 提供 `get_redis()` 单例（同步 `redis.Redis`，`decode_responses=True`）。

解析大文件时按处理单元推进进度，写 `parse:progress:{fileId}` = 百分比整数（0–100），TTL 1h：
- epub：已处理 XHTML 文件数 / 总数
- pdf：已处理页数 / 总页数
- docx/txt/md：已处理字符块 / 估算总块

Java 侧 `UploadService.getProgress(fileId)` 读同一 Redis 键（novel-studio 已用 Redis，复用 `StringRedisTemplate`），`GET /upload/files/{fileId}` 返回 `progress` 字段；status=ready 时强制 100。无章节结构的整体解析按已处理字节估算。

### 依赖

`requirements.txt` 新增：`pypdf`、`html2text`、`beautifulsoup4`。
（`python-docx` 不必——直接解 zip 读 XML 更轻；epub 本质是 zip+XHTML，复用 zipfile+bs4。）

### 错误处理

| 情况 | 返回 | Java 侧 |
|------|------|---------|
| 格式不支持 | `{ error:"unsupported_format" }` | status=failed, parse_error |
| 解析异常 | `{ error:"parse_failed", detail }` | status=failed, parse_error |
| 扫描型 PDF | `{ error:"pdf_scan_unsupported" }` | status=failed, parse_error（明确提示用户，OCR 后续） |

### 幂等/重试

MQ 重试时同一 fileId 可能多次调 `/internal/parse`——python 无状态、纯解析。Java 端按 `uploader_file_id` 唯一约束（§2）保证不重复入 catalog：重试时若 catalog 已存在则跳过新建、仅补章节。

## §6 前端

### 新页面 `MyLibraryPage.tsx`（路由 `/dashboard/my-library`）

聚合展示 `crawl_catalog_novel WHERE owner_id=userId`（即用户私人书库：自己上传解析来的，source=upload）。

顶部嵌 `FileUploader` + 配额显示（`used/limit`）。

### 两个动作的区分（重要）

| 动作 | 含义 | 数据落地 |
|------|------|----------|
| **收藏到我的书库**（新） | 公共书库条目轻引用进我的私人书库，作参考语料 | `crawl_catalog_novel` 复制一条 owner_id=userId（不克隆章节正文，仅引用 catalog_novel_id） |
| **添加到我的小说**（已有 `addToUserLibrary`） | 克隆成用户作品 | `novel`/`chapter` 表新建 |

"我的书库"= 参考语料库（按需检索/RAG，留模块 1/4）；"我的小说"= 用户作品库。两者不同。

公共书库页（`BookstorePage.tsx`）每条增加"收藏到我的书库"按钮（调新端点）。

**收藏端点**：
```
POST /api/content/auth/catalog/{catalogNovelId}/collect   (X-User-Id 鉴权)
  → 在 crawl_catalog_novel 复制一条 owner_id=userId, source='crawl'(沿用原 source), uploader_file_id=null 的记录
  → 不复制章节正文（我的书库浏览/检索时按 catalog_novel_id 回查原公共条目章节）
  → 已收藏则幂等返回（不重复复制）
  → 返回 { myCatalogNovelId }
```
注：收藏记录的 `source` 沿用原公共条目的 source（多为 `crawl`）；`owner_id=userId` 是"我的书库"归属的唯一标识。`source='upload'` 仅用于用户自己上传解析来的条目。

### `FileUploader.tsx`（`components/ui/`）

- 拖拽区 + 点击选择，`accept=".txt,.md,.markdown,.epub,.pdf,.docx"`
- 上传中进度条（XHR `onprogress`）
- 文件项：名称、大小、状态徽章（待解析/解析中/已就绪/失败）+ 解析进度条
- 失败显示 `parse_error` + "重试"按钮

### 状态/进度轮询

上传返回 fileId 后，若 status != ready，每 2s 轮询 `GET /upload/files/{fileId}`：
- status=parsing → 显示进度条 `解析中 {progress}%`
- status=ready → 刷新书库列表
- status=failed → 显示错误 + 重试按钮

### 配额 UI

上传区显示 `已用 {used} / {limit}`，满额时禁用上传 + 提示升级套餐（limit=null 时显示"无限"）。

### API client `uploadApi.ts`

```ts
uploadFile(file, isAdmin, title?)        // POST multipart
listFiles(params, isAdmin)               // GET list
getFile(id)                              // GET detail (含 progress)
deleteFile(id)                           // DELETE
retryParse(id)                           // POST retry
getQuota()                               // GET quota
collectToMyLibrary(catalogNovelId)       // 公共书库→我的书库（新动作）
```

### 最小可视路径

用户进"我的书库" → 上传 epub → 进度条 → 待解析 → 轮询进度 → 已就绪 → 出现在我的书库列表 → 后续可 addToLibrary 到小说（已有动作）。

## §7 安全 / 限制 / 测试 / 迁移

### 安全与限制

- **文件大小上限**：`app.upload.max-file-size`（默认 50MB），超限 413
- **扩展名白名单**：txt/md/markdown/epub/pdf/docx；非白名单 400
- **MIME 校验**：除扩展名，校验 magic bytes（epub/docx=PK zip、pdf=%PDF）防伪装
- **鉴权**：用户端点 `X-User-Id` filter；admin 端点 CRM 鉴权；python `/internal/parse` 走 `X-Internal-Service-Key`
- **隔离**：用户只能访问 `owner_id=自己`；查询/删除/重试均按 owner 过滤
- **存储路径**：`storage_key` 用 `yyyy/MM/dd/{uuid}.{ext}`，不暴露原始文件名防路径穿越

### 配置项（`application.yml`）

```yaml
app:
  upload:
    storage-dir: ${UPLOAD_STORAGE_DIR:./data/uploads}
    max-file-size: 50MB
    allowed-formats: [txt, md, markdown, epub, pdf, docx]
```

### DB 迁移（新文件 `V15__upload_and_catalog_owner.sql`，content 模块）

- 建 `uploaded_file` 表 + 索引
- `crawl_catalog_novel` 加 `owner_id`/`source`/`uploader_file_id` + 索引 + 唯一约束
- `plan_feature` 加 `limit_value` 列 + seed `library_upload_limit`
- `user_quota_override` 加 `library_upload_bonus` 列

### 测试

- **python-ai**（`tests/test_parse_*.py`）：每解析器单测——各格式 fixture 文件，断言提取文本/章节；错误码用例（扫描型 pdf、损坏 epub、不支持格式）；进度写入断言
- **Java**：`UploadService` 配额检查/落盘/MQ 发布单测；`FileParseListener` 回写 catalog 单测（含重试幂等）；鉴权隔离单测（用户 A 不能查用户 B）；`FeatureGateBiz.getFeatureLimit` 单测
- **集成**：上传 txt → 轮询 ready → 出现在我的书库，端到端

### 关键文件清单

**Java（novel-studio）**
- `studio-platform-storage`：`StorageBackend`（接口）、`LocalDiskStorageBackend`、`StorageProperties`
- `studio-module-content`：
  - `controller/auth/AuthUploadController`、`controller/crm/CrmUploadController`
  - `service/UploadService`、`service/auth/biz/AuthUploadBiz`
  - `entity/UploadedFileEntity` + `repository/UploadedFileRepository`
  - `client/PythonParseClient`
  - `service/biz/CatalogService` 扩展（collectToMyLibrary 轻引用）
- `studio-platform-messaging`：`FileParseMessage`、`MqTopic.FILE_PARSE` + DLX 配置
- `studio-module-worker`：`FileParseListener`
- `studio-module-billing`：`FeatureGateBiz.getFeatureLimit`、`EffectiveQuotaSupport.resolveLibraryUploadLimit`、`PlanFeatureEntity.limitValue`、`UserQuotaOverrideEntity.libraryUploadBonus`
- `studio-module-content` 迁移 `V15__upload_and_catalog_owner.sql`

**python-ai**
- `app/api/parse_routes.py`
- `app/parse/dispatcher.py`、`text_parser.py`、`epub_parser.py`、`pdf_parser.py`、`docx_parser.py`
- `requirements.txt`：`pypdf`、`html2text`、`beautifulsoup4`
- `main.py` 注册 parse_routes

**前端**
- `src/pages/dashboard/MyLibraryPage.tsx`
- `src/components/ui/FileUploader.tsx`
- `src/api/uploadApi.ts`
- `src/hooks/useUploadProgress.ts`（轮询进度）
- `BookstorePage.tsx` 加"收藏到我的书库"按钮
- 路由 + 侧栏入口

### 范围边界（YAGNI，本次不做）

- ❌ RAG 向量索引上传书（留模块 1/4）
- ❌ OCR 扫描型 PDF
- ❌ 对象存储实现（接口预留，仅本地实现）
- ❌ 上传书的全文检索（仅目录浏览）
- ❌ 解析进度 SSE（用 Redis 轮询）
- ❌ 续传/分片上传（50MB 内全量上传足够）

### 风险与备注

- **MQ 重试幂等**：靠 `uploader_file_id` 唯一约束保证不重复入 catalog；python 端纯解析无副作用，重复调用安全
- **本地磁盘多 pod**：生产若 novel-studio 多副本，本地磁盘不共享——但本设计 Java 传字节流给 python，存储仅 novel-studio 自身访问，无跨 pod 读文件需求；删除时各副本 storage-dir 需一致或走共享卷（部署时约定）
- **大文件解析超时**：python `/internal/parse` 设超时（如 5min）；超时 → MQ 重试；3 次失败 → failed，用户可手动重试
- **配额并发**：上传并发可能短暂超配额（check-then-insert 非原子）——可接受（个人书库场景，偶发 +1）；若严格可加 `SELECT FOR UPDATE` 或 Redis 原子计数
