# Part 1 — Java 索引实现计划

> 主索引：[2026-06-19-library.md](./2026-06-19-library.md)
> 设计：[册1 §2/§3](../specs/2026-06-19-library-design.md)
> 约定：包根 `cn.novelstudio.module.content`；Java 21；`JAVA_HOME=/d/Programs/Java/jdk_21`。先写失败测试。
> **依赖模块5**：catalog owner_id/source/uploader_file_id 已由模块5 V15 加；本 V19 在其上。

---

## Task 1: V19 迁移 + CrawlCatalogNovelEntity 字段

**Files:**
- Create: `novel-studio/studio-modules/studio-module-content/src/main/resources/db/migration/V19__library_index.sql`
- Modify: `.../entity/CrawlCatalogNovelEntity.java`

- [ ] **Step 1: 写迁移 SQL**

```sql
ALTER TABLE crawl_catalog_novel ADD COLUMN IF NOT EXISTS index_status VARCHAR(16) NOT NULL DEFAULT 'pending';
ALTER TABLE crawl_catalog_novel ADD COLUMN IF NOT EXISTS index_namespace VARCHAR(64);
```
（`pending | indexing | indexed | failed`；`library:<uid>:<id>` 私人 / `catalog:<id>` 公共 / null）

- [ ] **Step 2: CrawlCatalogNovelEntity 加字段**

在 `CrawlCatalogNovelEntity`（模块5 已加 owner_id/source/uploader_file_id）的 `uploaderFileId` 后加：
```java
    @Column(name = "index_status", nullable = false, length = 16)
    private String indexStatus = "pending";

    @Column(name = "index_namespace", length = 64)
    private String indexNamespace;
```
（Lombok `@Getter @Setter` 在类上。）

- [ ] **Step 3: 启动验证 Flyway + validate**

`_restart-dev-stack.ps1`，查日志无 Flyway/validate 报错；连 CN PG 确认两列（密码见 `scripts/local-cn.env`）：
```bash
PGPASSWORD=<pwd> psql -h 118.89.123.201 -p 15432 -U <u> -d <db> -c "\d crawl_catalog_novel"
```

- [ ] **Step 4: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/resources/db/migration/V19__library_index.sql \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/entity/CrawlCatalogNovelEntity.java
git commit -m "feat(library): V19 + CrawlCatalogNovelEntity index_status/index_namespace"
```

---

## Task 2: CatalogService getReferencedBook/updateIndexStatus/updateSummary

**Files:**
- Modify: `.../service/catalog/CatalogService.java`
- Create: `.../dto/ReferencedBookDTO.java`
- Test: `.../service/catalog/CatalogServiceLibraryTest.java`（聚焦新方法，mock repo）

> `getReferencedBook(catalogNovelId, userId)`：own 校验（私人书 owner_id=userId 或收藏；公共书任意）→ 返回 {catalogNovelId, title, summary(description), chapterTitles[], namespace, indexStatus}。

- [ ] **Step 1: 写 ReferencedBookDTO**

```java
package cn.novelstudio.module.content.dto;

import lombok.Data;
import java.util.List;

@Data
public class ReferencedBookDTO {
    private String catalogNovelId;
    private String title;
    private String summary;          // = description
    private List<String> chapterTitles;
    private String namespace;        // library:<uid>:<id> | catalog:<id>
    private String indexStatus;
}
```

- [ ] **Step 2: 写失败测试**

```java
package cn.novelstudio.module.content.service.catalog;

import cn.novelstudio.module.content.dto.ReferencedBookDTO;
import cn.novelstudio.module.content.entity.CrawlCatalogChapterEntity;
import cn.novelstudio.module.content.entity.CrawlCatalogNovelEntity;
import cn.novelstudio.module.content.repository.CrawlCatalogChapterRepository;
import cn.novelstudio.module.content.repository.CrawlCatalogNovelRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CatalogServiceLibraryTest {

    @Mock CrawlCatalogNovelRepository novelRepo;
    @Mock CrawlCatalogChapterRepository chapterRepo;
    @InjectMocks CatalogService svc;

    @Test
    void getReferencedBook_publicBook_returnsWithChapterTitles() {
        CrawlCatalogNovelEntity n = new CrawlCatalogNovelEntity();
        n.setId("c1"); n.setTitle("凡人修仙传"); n.setDescription("摘要");
        n.setIndexNamespace("catalog:c1"); n.setIndexStatus("indexed");
        n.setOwnerId(null); // 公共
        when(novelRepo.findById("c1")).thenReturn(Optional.of(n));
        CrawlCatalogChapterEntity ch1 = new CrawlCatalogChapterEntity();
        ch1.setTitle("第一章"); ch1.setSortOrder(1);
        CrawlCatalogChapterEntity ch2 = new CrawlCatalogChapterEntity();
        ch2.setTitle("第二章"); ch2.setSortOrder(2);
        when(chapterRepo.findByCatalogNovelIdOrderBySortOrderAsc("c1")).thenReturn(List.of(ch1, ch2));
        ReferencedBookDTO dto = svc.getReferencedBook("c1", 10L);
        assertThat(dto.getTitle()).isEqualTo("凡人修仙传");
        assertThat(dto.getChapterTitles()).containsExactly("第一章", "第二章");
        assertThat(dto.getNamespace()).isEqualTo("catalog:c1");
    }

    @Test
    void getReferencedBook_privateBook_ownedByUser_ok() {
        CrawlCatalogNovelEntity n = new CrawlCatalogNovelEntity();
        n.setId("c2"); n.setTitle("我的书"); n.setOwnerId(10L); n.setSource("upload");
        n.setIndexNamespace("library:10:c2");
        when(novelRepo.findById("c2")).thenReturn(Optional.of(n));
        when(chapterRepo.findByCatalogNovelIdOrderBySortOrderAsc("c2")).thenReturn(List.of());
        ReferencedBookDTO dto = svc.getReferencedBook("c2", 10L);
        assertThat(dto.getNamespace()).isEqualTo("library:10:c2");
    }

    @Test
    void getReferencedBook_privateBook_notOwned_throws() {
        CrawlCatalogNovelEntity n = new CrawlCatalogNovelEntity();
        n.setId("c3"); n.setOwnerId(99L); n.setSource("upload"); // 他人私人书
        when(novelRepo.findById("c3")).thenReturn(Optional.of(n));
        assertThatThrownBy(() -> svc.getReferencedBook("c3", 10L))
            .isInstanceOf(RuntimeException.class);
    }
}
```
（`CatalogService` 现有注入需含 `crawlCatalogNovelRepository`+`crawlCatalogChapterRepository`——确认字段名按实际。`userLibraryCollectionRepository` 用于收藏校验——getReferencedBook 私人书非 owner 时查收藏。）

- [ ] **Step 3: 跑测试验证失败**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=CatalogServiceLibraryTest
```

- [ ] **Step 4: CatalogService 加方法**

```java
    public ReferencedBookDTO getReferencedBook(String catalogNovelId, Long userId) {
        CrawlCatalogNovelEntity n = catalogNovelRepository.findById(catalogNovelId)
            .orElseThrow(() -> new IllegalArgumentException("书库条目不存在"));
        // own 校验：私人书须 owner 或收藏；公共书任意
        if (n.getOwnerId() != null) {
            boolean owned = n.getOwnerId().equals(userId);
            if (!owned) {
                // 查收藏（模块5 user_library_collection）
                owned = userLibraryCollectionRepository.existsById(
                    new UserLibraryCollectionPk(userId, catalogNovelId));
            }
            if (!owned) throw new IllegalArgumentException("无权引用该书");
        }
        ReferencedBookDTO dto = new ReferencedBookDTO();
        dto.setCatalogNovelId(catalogNovelId);
        dto.setTitle(n.getTitle());
        dto.setSummary(n.getDescription());
        dto.setNamespace(n.getIndexNamespace());
        dto.setIndexStatus(n.getIndexStatus());
        dto.setChapterTitles(catalogChapterRepository
            .findByCatalogNovelIdOrderBySortOrderAsc(catalogNovelId).stream()
            .map(CrawlCatalogChapterEntity::getTitle).toList());
        return dto;
    }

    @Transactional
    public void updateIndexStatus(String catalogNovelId, String status) {
        CrawlCatalogNovelEntity n = catalogNovelRepository.findById(catalogNovelId).orElseThrow();
        n.setIndexStatus(status);
        catalogNovelRepository.save(n);
    }

    @Transactional
    public void updateSummary(String catalogNovelId, String summary) {
        CrawlCatalogNovelEntity n = catalogNovelRepository.findById(catalogNovelId).orElseThrow();
        n.setDescription(summary);
        catalogNovelRepository.save(n);
    }
```
（注入 `UserLibraryCollectionRepository` + `UserLibraryCollectionPk`——模块5 已建。若未建则收藏校验暂跳过，仅 owner 校验。）

- [ ] **Step 5: 跑测试验证通过**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=CatalogServiceLibraryTest
```
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/catalog/CatalogService.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/dto/ReferencedBookDTO.java \
        novel-studio/studio-modules/studio-module-content/src/test/java/cn/novelstudio/module/content/service/catalog/CatalogServiceLibraryTest.java
git commit -m "feat(library): CatalogService getReferencedBook/updateIndexStatus/updateSummary"
```

---

## Task 3: InternalCatalogController（/internal/catalog/{id}/summary）

**Files:**
- Create: `.../controller/internal/InternalCatalogController.java`

> `/internal/**` 自动被 `InternalServiceKeyInterceptor` 鉴权。

- [ ] **Step 1: 写控制器**

```java
package cn.novelstudio.module.content.controller.internal;

import cn.novelstudio.module.content.service.catalog.CatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/internal/catalog")
@RequiredArgsConstructor
public class InternalCatalogController {

    private final CatalogService catalogService;

    @PostMapping("/{catalogNovelId}/summary")
    public Map<String, Object> updateSummary(@PathVariable String catalogNovelId,
                                             @RequestBody Map<String, String> body) {
        catalogService.updateSummary(catalogNovelId, body.get("summary"));
        return Map.of("ok", true);
    }
}
```

- [ ] **Step 2: 编译 + 提交**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/controller/internal/InternalCatalogController.java
git commit -m "feat(library): InternalCatalogController /internal/catalog/{id}/summary"
```

---

## Task 4: MqTopic.LIBRARY_INDEX + LibraryIndexMessage

**Files:**
- Modify: `studio-platform/studio-platform-messaging/.../constant/MqTopic.java`
- Create: `studio-platform/studio-platform-messaging/.../library/LibraryIndexMessage.java`

- [ ] **Step 1: MqTopic 加枚举**

在 `MqTopic` 末尾枚举值后加（注意模块6 可能已加 KG_BACKFILL——按现有末尾追加）：
```java
    ,

    // 书库书 RAG 索引（私人书）
    LIBRARY_INDEX("agent.library-index.exchange", "library.index", "agent.library-index.queue"),
```

- [ ] **Step 2: 写 LibraryIndexMessage**

```java
package cn.novelstudio.platform.messaging.library;

public record LibraryIndexMessage(
    String catalogNovelId,
    Long userId,
    String namespace        // library:<uid>:<id>
) {}
```

- [ ] **Step 3: 编译 + 提交**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-platform/studio-platform-messaging -am compile
git add novel-studio/studio-platform/studio-platform-messaging/
git commit -m "feat(library): MqTopic.LIBRARY_INDEX + LibraryIndexMessage"
```

---

## Task 5: LibraryIndexListener（逐章索引+摘要）

**Files:**
- Create: `studio-modules/studio-module-worker/.../listener/LibraryIndexListener.java`

> 镜像 `CatalogIndexListener`：消费 MQ → 逐章 POST python `/api/rag/index/chapter`(novel_id=namespace) → 全部完调 python `/internal/library/summarize` → POST Java `/internal/catalog/{id}/summary` 回写 + index_status=indexed。worker 须依赖 content 模块（模块5/6 已确认）。

- [ ] **Step 1: 写 listener**

```java
package cn.novelstudio.module.worker.listener;

import cn.novelstudio.module.content.dto.CatalogChapterDetailDTO;
import cn.novelstudio.module.content.entity.CrawlCatalogChapterEntity;
import cn.novelstudio.module.content.repository.CrawlCatalogChapterRepository;
import cn.novelstudio.module.content.service.catalog.CatalogService;
import cn.novelstudio.module.worker.support.MqListenerSupport;
import cn.novelstudio.platform.messaging.library.LibraryIndexMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.util.*;

@Component
public class LibraryIndexListener {

    private static final Logger log = LoggerFactory.getLogger(LibraryIndexListener.class);

    private final ObjectMapper objectMapper;
    private final CatalogService catalogService;
    private final CrawlCatalogChapterRepository chapterRepo;
    private final RestClient pythonRestClient;
    private final String internalKey;

    public LibraryIndexListener(ObjectMapper objectMapper, CatalogService catalogService,
                                CrawlCatalogChapterRepository chapterRepo,
                                @Qualifier("pythonRestClient") RestClient pythonRestClient,
                                @Value("${agent.internal.service-key:dev-internal-key-change-me}") String internalKey) {
        this.objectMapper = objectMapper; this.catalogService = catalogService;
        this.chapterRepo = chapterRepo; this.pythonRestClient = pythonRestClient;
        this.internalKey = internalKey;
    }

    @RabbitListener(queuesToDeclare = @Queue(name = "agent.library-index.queue", durable = "true"))
    public void onLibraryIndex(String message) {
        MqListenerSupport.safeHandle(log, message, "书库书索引失败", this::handle);
    }

    private void handle(String message) throws Exception {
        LibraryIndexMessage payload = objectMapper.readValue(message, LibraryIndexMessage.class);
        String catalogNovelId = payload.catalogNovelId();
        String namespace = payload.namespace();
        catalogService.updateIndexStatus(catalogNovelId, "indexing");

        List<CrawlCatalogChapterEntity> chapters = chapterRepo.findByCatalogNovelIdOrderBySortOrderAsc(catalogNovelId);
        List<String> chapterTitles = new ArrayList<>();
        List<String> firstChunks = new ArrayList<>();
        for (CrawlCatalogChapterEntity ch : chapters) {
            String content = ch.getContent() == null ? "" : ch.getContent();
            String title = ch.getTitle() == null ? "" : ch.getTitle().trim();
            if (title.isEmpty()) continue;
            Map<String, Object> body = new HashMap<>();
            body.put("novel_id", namespace);
            body.put("chapter_id", ch.getId());
            body.put("title", title);
            body.put("content", content);
            pythonRestClient.post().uri("/api/rag/index/chapter")
                .header("X-Internal-Service-Key", internalKey)
                .body(body).retrieve().toBodilessEntity();
            chapterTitles.add(title);
            firstChunks.add(content.length() > 500 ? content.substring(0, 500) : content);
        }

        // 摘要
        try {
            Map<String, Object> sumReq = new HashMap<>();
            sumReq.put("catalogNovelId", catalogNovelId);
            sumReq.put("chapterTitles", chapterTitles);
            sumReq.put("firstChunks", firstChunks);
            JsonNode sumResp = pythonRestClient.post().uri("/internal/library/summarize")
                .header("X-Internal-Service-Key", internalKey)
                .body(sumReq).retrieve().body(JsonNode.class);
            String summary = sumResp != null ? sumResp.path("summary").asText("") : "";
            if (!summary.isBlank()) {
                // 回写 Java
                pythonRestClient.post().uri("/internal/catalog/" + catalogNovelId + "/summary")
                    .header("X-Internal-Service-Key", internalKey)
                    .body(Map.of("summary", summary)).retrieve().toBodilessEntity();
            }
        } catch (Exception e) {
            log.warn("library summary failed novel={}: {}", catalogNovelId, e.getMessage());
        }

        catalogService.updateIndexStatus(catalogNovelId, "indexed");
    }
}
```
（失败处理：handle 内任一章失败被 safeHandle 捕获记 error；index_status 留 indexing。补 try/catch 置 failed：在 handle 末尾的 updateIndexStatus 外包 try，异常时 `catalogService.updateIndexStatus(catalogNovelId, "failed")`。）

- [ ] **Step 2: 确认 worker pom 依赖 content**

模块5/6 已确认 worker 依赖 content；跳过。

- [ ] **Step 3: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-worker -am compile
```

- [ ] **Step 4: 提交**

```bash
git add novel-studio/studio-modules/studio-module-worker/src/main/java/cn/novelstudio/module/worker/listener/LibraryIndexListener.java
git commit -m "feat(library): LibraryIndexListener 逐章索引+摘要"
```

---

Part 1 完成。→ 继续 [Part 2 — Java @引用](./2026-06-19-library-part2-java-context.md)
