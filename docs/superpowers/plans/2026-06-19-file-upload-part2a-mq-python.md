# Part 2a — MQ + python-ai 实现计划

> 主索引：[2026-06-19-file-upload.md](./2026-06-19-file-upload.md)
> 设计：[spec part2](../specs/2026-06-19-file-upload-design-part2.md)
> **依赖 Part1 Task 9**（UploadService 引用 `MqTopic.FILE_PARSE` + `FileParseMessage`），故 Task 13/14 须在 Part1 Task 9 之前完成。

**约定**：Java 21；python 测试 `cd python-ai && python -m pytest tests/test_parse_*.py -q`。

---
---

## Task 13: MqTopic.FILE_PARSE + FileParseMessage

**Files:**
- Modify: `novel-studio/studio-platform/studio-platform-messaging/src/main/java/cn/novelstudio/platform/messaging/constant/MqTopic.java`
- Create: `novel-studio/studio-platform/studio-platform-messaging/src/main/java/cn/novelstudio/platform/messaging/upload/FileParseMessage.java`

- [ ] **Step 1: MqTopic 加枚举常量**

在 `MqTopic` 枚举的 `USAGE_EVENT` 后、分号前加：
```java
    ,

    // 文件上传异步解析
    FILE_PARSE("agent.file.parse.exchange", "file.parse", "agent.file.parse.queue"),
```

- [ ] **Step 2: 写 FileParseMessage record**

```java
package cn.novelstudio.platform.messaging.upload;

public record FileParseMessage(
    String fileId,
    Long ownerId,
    String ownerType,    // 'user' | 'admin'
    String storageKey,
    String format,       // txt|md|epub|pdf|docx
    String originalName,
    int attempt
) {
    public FileParseMessage(String fileId, Long ownerId, String ownerType,
                            String storageKey, String format, String originalName) {
        this(fileId, ownerId, ownerType, storageKey, format, originalName, 0);
    }
}
```

- [ ] **Step 3: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-platform/studio-platform-messaging -am compile
```
（`MQInitializerConfig` 会自动声明该 topic 的 exchange/queue/binding——见 Part1 探索结论。）

- [ ] **Step 4: 提交**

```bash
git add novel-studio/studio-platform/studio-platform-messaging/
git commit -m "feat(upload): MqTopic.FILE_PARSE + FileParseMessage"
```

---

## Task 14: PythonParseClient（POST /internal/parse）

**Files:**
- Create: `novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/client/PythonParseClient.java`

> 模式参考 `PythonCrawlClient`：注入 `RestClient pythonRestClient` + `ObjectMapper` + `ContentRuntimeProperties`（取 `internalServiceKey()`）。传文件字节流用 `MultipartBodyBuilder`（Spring 6）。

- [ ] **Step 1: 写 PythonParseClient**

```java
package cn.novelstudio.module.content.client;

import cn.novelstudio.module.content.config.ContentRuntimeProperties;
import cn.novelstudio.module.content.storage.StorageBackend;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class PythonParseClient {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String internalKey;
    private final StorageBackend storage;

    public PythonParseClient(RestClient pythonRestClient, ObjectMapper objectMapper,
                             ContentRuntimeProperties props, StorageBackend storage) {
        this.restClient = pythonRestClient;
        this.objectMapper = objectMapper;
        this.internalKey = props.internalServiceKey();
        this.storage = storage;
    }

    /** 调 python /internal/parse。返回 JSON：{title, chapters:[{title,content,sort_order}], text, error?} */
    public JsonNode parse(String fileId, String storageKey, String format, String originalName) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", storage.load(storageKey))
            .filename(originalName)
            .contentType(MediaType.APPLICATION_OCTET_STREAM);
        builder.part("format", format);
        builder.part("originalName", originalName);
        builder.part("fileId", fileId);

        return restClient.post()
            .uri("/internal/parse")
            .header("X-Internal-Service-Key", internalKey)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(builder.build())
            .retrieve()
            .body(JsonNode.class);
    }
}
```
（`MultipartBodyBuilder.part(name, Resource)` 接受 `Resource`——`storage.load` 返回 `InputStream`，需包成 `InputStreamResource`。修正：用 `new org.springframework.core.io.InputStreamResource(storage.load(storageKey))`。注意 `InputStreamResource` 只能读一次，本场景 OK。）

- [ ] **Step 2: 修正 part 的 Resource 包装**

把 `builder.part("file", storage.load(storageKey))` 改为：
```java
        builder.part("file", new org.springframework.core.io.InputStreamResource(storage.load(storageKey)) {
            @Override public String getFilename() { return originalName; }
        }).filename(originalName).contentType(MediaType.APPLICATION_OCTET_STREAM);
```

- [ ] **Step 3: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
```

- [ ] **Step 4: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/client/PythonParseClient.java
git commit -m "feat(upload): PythonParseClient—POST /internal/parse（multipart 字节流）"
```

---

## Task 15: FileParseListener（消费 MQ → 调 python → 回写 catalog + 状态）

**Files:**
- Create: `novel-studio/studio-modules/studio-module-worker/src/main/java/cn/novelstudio/module/worker/listener/FileParseListener.java`
- Create: `novel-studio/studio-modules/studio-module-worker/src/main/java/cn/novelstudio/module/worker/support/FileParseHandler.java`（可选，逻辑也可内联）

> 模式参考 `CrawlDispatchListener`：`@RabbitListener(queuesToDeclare = @Queue(name="agent.file.parse.queue", durable="true"))` + `MqListenerSupport.safeHandle` + `objectMapper.readValue`。注意 worker 模块需能注入 `PythonParseClient`（content 模块的）——确认 worker 依赖 content 模块（`studio-module-worker/pom.xml` 是否依赖 `studio-module-content`；若否，把解析回写逻辑放 content 模块的 service，worker 只调 content 的 service）。**推荐**：把回写逻辑放 `UploadService.finalizeParse(fileId, JsonNode)`，worker listener 调它。

- [ ] **Step 1: UploadService 加 finalizeParse 方法**

在 `UploadService`（Part1 Task 9）加：
```java
    @org.springframework.transaction.annotation.Transactional
    public void finalizeParse(String fileId, com.fasterxml.jackson.databind.JsonNode result) {
        UploadedFileEntity e = fileRepo.findById(fileId).orElseThrow();
        if (result.has("error")) {
            e.setStatus("failed");
            e.setParseError(result.path("error").asText()
                + (result.has("detail") ? ": " + result.path("detail").asText() : ""));
            fileRepo.save(e);
            return;
        }
        // 幂等：已有 catalog 则跳过新建
        if (e.getCatalogNovelId() != null && catalogRepo.existsById(e.getCatalogNovelId())) {
            e.setStatus("ready"); fileRepo.save(e); setProgress(fileId, 100); return;
        }
        // 建 catalog novel
        cn.novelstudio.module.content.entity.CrawlCatalogNovelEntity novel = new cn.novelstudio.module.content.entity.CrawlCatalogNovelEntity();
        novel.setTitle(result.path("title").asText(e.getOriginalName()));
        novel.setOwnerId(e.getOwnerId());
        novel.setSource("upload");
        novel.setUploaderFileId(fileId);
        novel.setChapterCount(0);
        novel = catalogRepo.save(novel);

        // 写章节
        com.fasterxml.jackson.databind.node.ArrayNode chapters = (com.fasterxml.jackson.databind.node.ArrayNode) result.path("chapters");
        int idx = 1;
        if (chapters != null && !chapters.isEmpty()) {
            for (JsonNode ch : chapters) {
                cn.novelstudio.module.content.entity.CrawlCatalogChapterEntity c = new cn.novelstudio.module.content.entity.CrawlCatalogChapterEntity();
                c.setId(cn.novelstudio.kernel.tools.IdWorker.nextIdStr());
                c.setCatalogNovelId(novel.getId());
                c.setTitle(ch.path("title").asText("第" + idx + "章"));
                c.setContent(ch.path("content").asText(""));
                c.setSortOrder(ch.path("sort_order").asInt(idx));
                c.setWordCount(c.getContent().length());
                catalogChapterRepo.save(c);
                idx++;
            }
            novel.setChapterCount(idx - 1);
        } else {
            // text 单章
            String text = result.path("text").asText("");
            cn.novelstudio.module.content.entity.CrawlCatalogChapterEntity c = new cn.novelstudio.module.content.entity.CrawlCatalogChapterEntity();
            c.setId(cn.novelstudio.kernel.tools.IdWorker.nextIdStr());
            c.setCatalogNovelId(novel.getId());
            c.setTitle(e.getOriginalName());
            c.setContent(text);
            c.setSortOrder(1);
            c.setWordCount(text.length());
            catalogChapterRepo.save(c);
            novel.setChapterCount(1);
        }
        catalogRepo.save(novel);
        e.setCatalogNovelId(novel.getId());
        e.setStatus("ready");
        fileRepo.save(e);
        setProgress(fileId, 100);
    }
```
（需注入 `CrawlCatalogChapterRepository catalogChapterRepo`——在 UploadService 构造器加该字段。`import com.fasterxml.jackson.databind.JsonNode;`）

- [ ] **Step 2: 写 FileParseListener**

```java
package cn.novelstudio.module.worker.listener;

import cn.novelstudio.module.content.client.PythonParseClient;
import cn.novelstudio.module.content.service.UploadService;
import cn.novelstudio.module.worker.support.MqListenerSupport;
import cn.novelstudio.platform.messaging.upload.FileParseMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class FileParseListener {

    private static final Logger log = LoggerFactory.getLogger(FileParseListener.class);

    private final ObjectMapper objectMapper;
    private final PythonParseClient parseClient;
    private final UploadService uploadService;

    public FileParseListener(ObjectMapper objectMapper, PythonParseClient parseClient, UploadService uploadService) {
        this.objectMapper = objectMapper;
        this.parseClient = parseClient;
        this.uploadService = uploadService;
    }

    @RabbitListener(queuesToDeclare = @Queue(name = "agent.file.parse.queue", durable = "true"))
    public void onParse(String message) {
        MqListenerSupport.safeHandle(log, message, "file.parse failed", this::handle);
    }

    private void handle(String message) throws Exception {
        FileParseMessage payload = objectMapper.readValue(message, FileParseMessage.class);
        // 标记 parsing
        uploadService.markParsing(payload.fileId());
        JsonNode result = parseClient.parse(payload.fileId(), payload.storageKey(),
            payload.format(), payload.originalName());
        uploadService.finalizeParse(payload.fileId(), result);
    }
}
```
（`UploadService.markParsing(fileId)`——加方法把 status 置 `parsing`：）
```java
    @org.springframework.transaction.annotation.Transactional
    public void markParsing(String fileId) {
        fileRepo.findById(fileId).ifPresent(e -> { e.setStatus("parsing"); fileRepo.save(e); });
    }
```

- [ ] **Step 3: 确认 worker 模块依赖**

检查 `studio-module-worker/pom.xml` 是否依赖 `studio-module-content`。若否，加：
```xml
<dependency>
    <groupId>cn.novelstudio</groupId>
    <artifactId>studio-module-content</artifactId>
</dependency>
```
（核实 groupId/version 写法按 pom 实际。）

- [ ] **Step 4: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-worker -am compile
```

- [ ] **Step 5: 提交**

```bash
git add novel-studio/studio-modules/studio-module-worker/src/main/java/cn/novelstudio/module/worker/listener/FileParseListener.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/UploadService.java
git commit -m "feat(upload): FileParseListener—消费 MQ 调 python 解析回写 catalog"
```

---

## Task 16: python-ai Redis 客户端 + 配置

**Files:**
- Create: `python-ai/app/core/redis_client.py`
- Modify: `python-ai/app/config.py`
- Modify: `python-ai/requirements.txt`（加 redis）

- [ ] **Step 1: config.py 加 redis_url**

在 `app/config.py` 的 `Settings` 类内（`internal_service_key` 附近）加：
```python
    redis_url: str = "redis://127.0.0.1:6379/0"
```

- [ ] **Step 2: 写 redis_client.py**

```python
"""Redis 单例（解析进度等）。复用 CN 开发中间件 118.89.123.201:16379。"""

from __future__ import annotations

import logging

from redis import Redis

from app.config import settings

logger = logging.getLogger(__name__)

_redis: Redis | None = None


def get_redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(settings.redis_url, decode_responses=True)
        logger.info("redis connected url=%s", settings.redis_url)
    return _redis


def set_parse_progress(file_id: str, pct: int, ttl_sec: int = 3600) -> None:
    try:
        get_redis().set(f"parse:progress:{file_id}", str(pct), ex=ttl_sec)
    except Exception as e:  # 进度非关键，失败不阻断解析
        logger.warning("set parse progress failed fileId=%s err=%s", file_id, e)


def get_parse_progress(file_id: str) -> int | None:
    try:
        v = get_redis().get(f"parse:progress:{file_id}")
        return int(v) if v is not None else None
    except Exception:
        return None
```

- [ ] **Step 3: requirements.txt 加依赖**

在 `python-ai/requirements.txt` 加：
```
redis>=5.0.0
pypdf>=4.0.0
beautifulsoup4>=4.12.0
html2text>=2024.2.26
python-multipart>=0.0.9
```

- [ ] **Step 4: 装依赖 + 测试连接**

```bash
cd python-ai && pip install redis pypdf beautifulsoup4 html2text python-multipart
```
设 `REDIS_URL=redis://118.89.123.201:16379/0`（CN 中间件，无密码；核实 `scripts/local-cn.env` 的 `REDIS_*`），快速验证：
```bash
REDIS_URL=redis://118.89.123.201:16379/0 python -c "from app.core.redis_client import get_redis; print(get_redis().ping())"
```
Expected: `True`。

- [ ] **Step 5: 提交**

```bash
git add python-ai/app/core/redis_client.py python-ai/app/config.py python-ai/requirements.txt
git commit -m "feat(parse): python-ai Redis 客户端 + 进度读写 + 依赖"
```

---


--- Part 2a 完成。继续 [Part 2b](./2026-06-19-file-upload-part2b-mq-python.md)。
