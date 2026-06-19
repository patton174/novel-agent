# 模块 5：本地文件上传 — 实现计划（主索引）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> 本计划按层拆为 5 个分册（每文件 < 1000 行），按顺序执行：
> 1. [part1a-java](./2026-06-19-file-upload-part1a-java.md) — Java 后端①（迁移/实体/存储/配额实体）
> 2. [part1b-java](./2026-06-19-file-upload-part1b-java.md) — Java 后端②（配额解析/角色门/UploadService/控制器/收藏）
> 3. [part2a-mq-python](./2026-06-19-file-upload-part2a-mq-python.md) — Java MQ+监听器+客户端 / python-ai Redis
> 4. [part2b-mq-python](./2026-06-19-file-upload-part2b-mq-python.md) — python-ai 解析器+路由+进度
> 5. [part3-frontend](./2026-06-19-file-upload-part3-frontend.md) — 前端（页面/上传组件/API/轮询/i18n/导航）
>
> **执行顺序注意**：Part1b 的 Task 9（UploadService）引用 `MqTopic.FILE_PARSE` + `FileParseMessage`，故 **Part2a 的 Task 13/14 须在 Task 9 之前完成**。建议顺序：part1a → part2a(Task13/14) → part1b → part2a(余) → part2b → part3。
>
> 设计文档：[2026-06-19-file-upload-design.md](../specs/2026-06-19-file-upload-design.md) + [part2](../specs/2026-06-19-file-upload-design-part2.md)

**Goal:** 用户/管理员可上传 txt/md/epub/pdf/docx 文件，异步解析为纯文本/章节写入书库目录（复用 crawl_catalog_* + owner 隔离），用户私人书库受套餐配额限制，前端"我的书库"页管理并显示解析进度。

**Architecture:** Java(novel-studio) 主导上传——收 multipart → 落本地磁盘(StorageBackend 抽象) → 写 uploaded_file 元数据(pending) → 发 MQ → 立即返回 fileId。studio-module-worker 消费 MQ → 调 python-ai `/internal/parse`（传字节流）→ 回写 crawl_catalog_* + 状态 ready。python-ai 解析时分段写 Redis 进度，Java 读 Redis 返回前端轮询。配额走 plan_feature.limit_value + user_quota_override.library_upload_bonus。CRM 端点手动校验 admin 角色。

**Tech Stack:** Java 21 / Spring Boot / JPA / Flyway / RabbitMQ / Redis(StringRedisTemplate) / RestClient；python-ai FastAPI / pypdf / beautifulsoup4 / html2text / redis；前端 React+TS / Vite / secureFetch / lucide-react。

---

## 关键设计修正（相对 brainstorming 原稿，已与用户确认）

1. **python-ai 引入 Redis**：原 spec 假设 python 有 Redis，实际没有。本计划新增 `app/core/redis_client.py` + `redis` 依赖 + `REDIS_URL` 配置，复用 CN 中间件 118.89.123.201:16379。
2. **CRM admin 角色门**：codebase CRM 端点无角色检查。本计划在 `AuthRoleSupport` 工具类手动校验 `X-User-Roles` 含 `admin`，否则 403。

## 文件结构总览

### Java（novel-studio）
| 文件 | 职责 | 动作 |
|------|------|------|
| `studio-module-content/.../db/migration/V15__upload_and_catalog_owner.sql` | 建表+扩列+seed | Create |
| `studio-module-content/.../entity/UploadedFileEntity.java` | 文件元数据实体 | Create |
| `studio-module-content/.../repository/UploadedFileRepository.java` | 元数据 Repo | Create |
| `studio-module-content/.../entity/CrawlCatalogNovelEntity.java` | 加 owner_id/source/uploader_file_id | Modify |
| `studio-module-content/.../repository/CrawlCatalogNovelRepository.java` | 加 owner 查询 | Modify |
| `studio-platform-storage/.../StorageBackend.java` | 存储抽象接口 | Create |
| `studio-platform-storage/.../LocalDiskStorageBackend.java` | 本地磁盘实现 | Create |
| `studio-platform-storage/.../StorageProperties.java` | 存储配置 | Create |
| `studio-module-content/.../config/UploadProperties.java` | 上传配置(max-size/allowed) | Create |
| `studio-module-content/.../service/UploadService.java` | 上传编排(落盘/元数据/发MQ/查进度/删) | Create |
| `studio-module-content/.../service/auth/biz/AuthUploadBiz.java` | 用户上传 facade | Create |
| `studio-module-content/.../controller/auth/AuthUploadController.java` | 用户端点 | Create |
| `studio-module-content/.../controller/crm/CrmUploadController.java` | 管理员端点 | Create |
| `studio-platform-web/.../AuthRoleSupport.java` | admin 角色校验工具 | Create |
| `studio-module-content/.../service/catalog/CatalogService.java` | collectToMyLibrary 轻引用 | Modify |
| `studio-module-billing/.../entity/PlanFeatureEntity.java` | 加 limitValue | Modify |
| `studio-module-billing/.../entity/UserQuotaOverrideEntity.java` | 加 libraryUploadBonus | Modify |
| `studio-module-billing/.../support/EffectiveQuotaSupport.java` | resolveLibraryUploadLimit | Modify |
| `studio-module-billing/.../service/biz/FeatureGateBiz.java` | getFeatureLimit | Modify |
| `studio-platform-messaging/.../constant/MqTopic.java` | FILE_PARSE 枚举 | Modify |
| `studio-platform-messaging/.../upload/FileParseMessage.java` | MQ 消息 record | Create |
| `studio-module-worker/.../listener/FileParseListener.java` | 消费 MQ → 调 python → 回写 | Create |
| `studio-module-content/.../client/PythonParseClient.java` | POST /internal/parse | Create |
| `studio-app/.../resources/application.yml` | multipart 配置 | Modify |

### python-ai
| 文件 | 职责 | 动作 |
|------|------|------|
| `app/core/redis_client.py` | Redis 单例 | Create |
| `app/config.py` | 加 redis_url | Modify |
| `app/parse/__init__.py` | 包标记 | Create |
| `app/parse/dispatcher.py` | 格式分发+进度写 Redis | Create |
| `app/parse/text_parser.py` | txt/md | Create |
| `app/parse/epub_parser.py` | epub | Create |
| `app/parse/pdf_parser.py` | pdf(文本型) | Create |
| `app/parse/docx_parser.py` | docx | Create |
| `app/parse/models.py` | Pydantic 响应模型 | Create |
| `app/api/parse_routes.py` | /internal/parse 路由 | Create |
| `app/main.py` | 注册 parse_routes | Modify |
| `requirements.txt` | pypdf/bs4/html2text/redis/python-multipart | Modify |
| `tests/test_parse_*.py` | 各解析器单测 | Create |

### 前端
| 文件 | 职责 | 动作 |
|------|------|------|
| `src/api/uploadApi.ts` | 上传/查询/删除/配额 API | Create |
| `src/types/file.ts` | UploadedFile 类型 | Create |
| `src/components/ui/FileUploader.tsx` | 上传组件 | Create |
| `src/hooks/useUploadProgress.ts` | 轮询进度 hook | Create |
| `src/pages/dashboard/MyLibraryPage.tsx` | 我的书库页 | Create |
| `src/pages/dashboard/BookstorePage.tsx` | 加"收藏到我的书库"按钮 | Modify |
| `src/App.tsx` | 路由+lazy import | Modify |
| `src/components/dashboard/AppSidebar.tsx` | 导航项 | Modify |
| `src/layouts/DashboardLayout.tsx` | PAGE_META | Modify |
| `src/i18n/locales/{zh,en}/dashboard.json` | myLibrary 文案 | Modify |
| `src/i18n/locales/{zh,en}/common.json` | nav + layout 文案 | Modify |

## 任务索引（按分册执行）

### Part 1 — Java 后端（[part1](./2026-06-19-file-upload-part1-java.md)）
- Task 1: DB 迁移 V15
- Task 2: UploadedFileEntity + Repo
- Task 3: CrawlCatalogNovelEntity 扩展 + Repo
- Task 4: StorageBackend 抽象 + LocalDiskStorageBackend + StorageProperties
- Task 5: UploadProperties + multipart 配置
- Task 6: PlanFeatureEntity.limitValue + UserQuotaOverrideEntity.libraryUploadBonus + 迁移 seed
- Task 7: EffectiveQuotaSupport.resolveLibraryUploadLimit + FeatureGateBiz.getFeatureLimit
- Task 8: AuthRoleSupport admin 校验
- Task 9: UploadService（落盘/元数据/查进度/删/配额检查）
- Task 10: AuthUploadBiz + AuthUploadController（用户端点）
- Task 11: CrmUploadController（管理员端点）
- Task 12: CatalogService.collectToMyLibrary 轻引用

### Part 2 — MQ + python-ai（[part2](./2026-06-19-file-upload-part2-mq-python.md)）
- Task 13: MqTopic.FILE_PARSE + FileParseMessage
- Task 14: PythonParseClient（POST /internal/parse）
- Task 15: FileParseListener（消费 MQ → 调 python → 回写 catalog + 状态）
- Task 16: python-ai Redis 客户端 + 配置
- Task 17: python-ai 解析模型 + text_parser
- Task 18: python-ai epub_parser
- Task 19: python-ai pdf_parser
- Task 20: python-ai docx_parser
- Task 21: python-ai dispatcher + parse_routes + 注册
- Task 22: requirements.txt 依赖

### Part 3 — 前端（[part3](./2026-06-19-file-upload-part3-frontend.md)）
- Task 23: types/file.ts + uploadApi.ts
- Task 24: useUploadProgress hook
- Task 25: FileUploader 组件
- Task 26: MyLibraryPage 页面
- Task 27: BookstorePage 收藏按钮
- Task 28: 路由 + 导航 + PAGE_META + i18n

## 执行约定

- **TDD**：每个任务先写失败测试 → 跑红 → 实现 → 跑绿 → 提交。
- **频繁提交**：每任务一提交，commit message 用 `feat(upload):` / `feat(parse):` / `feat(my-library):` 前缀。
- **Java 测试**：JUnit 5 + Spring Boot Test，`mvn -pl <module> -am test`（需 JDK 21，`JAVA_HOME=/d/Programs/Java/jdk_21`）。
- **python 测试**：`cd python-ai && python -m pytest tests/test_parse_*.py -q`。
- **前端测试**：`cd frontend && npx vitest run`；类型检查 `npx tsc --noEmit`。
- **本地验证**：改动后用 `_restart-dev-stack.ps1` 重启栈（连 CN 中间件，owner-SSE 热路径无生产 MQ 风险）。
