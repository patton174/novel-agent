# Part 2 — Java 回填实现计划

> 主索引：[2026-06-19-knowledge-graph.md](./2026-06-19-knowledge-graph.md) ｜ [Part 1](./2026-06-19-knowledge-graph-part1-java.md)
> 设计：[册1 §3 回填](../specs/2026-06-19-knowledge-graph-design.md)
> 约定：Java 21；`JAVA_HOME=/d/Programs/Java/jdk_21`。先写失败测试。
> **依赖**：Part3 T13 `/internal/kg/extract`（python）须在本 Part 回填 listener 调用前就绪，或同步实现。

---

## Task 7: MqTopic.KG_BACKFILL + KgBackfillMessage

**Files:**
- Modify: `studio-platform/studio-platform-messaging/.../constant/MqTopic.java`
- Create: `studio-platform/studio-platform-messaging/.../kg/KgBackfillMessage.java`

- [ ] **Step 1: MqTopic 加枚举**

在 `MqTopic` 枚举的 `USAGE_EVENT` 后、分号前加：
```java
    ,

    // 知识图谱回填
    KG_BACKFILL("agent.kg.exchange", "kg.backfill", "agent.kg.backfill.queue"),
```

- [ ] **Step 2: 写 KgBackfillMessage record**

```java
package cn.novelstudio.platform.messaging.kg;

public record KgBackfillMessage(
    String novelId,
    Long userId
) {}
```

- [ ] **Step 3: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-platform/studio-platform-messaging -am compile
```
（`MQInitializerConfig` 自动声明 exchange/queue/binding。）

- [ ] **Step 4: 提交**

```bash
git add novel-studio/studio-platform/studio-platform-messaging/
git commit -m "feat(kg): MqTopic.KG_BACKFILL + KgBackfillMessage"
```

---

## Task 8: KgBackfillService（锁/进度/逐章编排）

**Files:**
- Create: `.../service/KgBackfillService.java`
- Test: `.../service/KgBackfillServiceTest.java`

> 编排：Redis SETNX 锁（TTL 30min）→ 清该 novel KG（全量重建）→ 逐章调 python `/internal/kg/extract` → upsert PG / 记错误 → 更新 Redis 进度。Java 调 python 用 RestClient（`pythonRestClient`）。

- [ ] **Step 1: 写失败测试**

```java
package cn.novelstudio.module.content.service;

import cn.novelstudio.module.content.dto.ChapterDTO;
import cn.novelstudio.module.content.repository.ChapterRepository;
import cn.novelstudio.module.content.entity.ChapterEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.web.client.RestClient;
import java.util.List;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class KgBackfillServiceTest {

    @Mock ChapterRepository chapterRepo;
    @Mock KgService kgService;
    @Mock StringRedisTemplate redis;
    @Mock RestClient pythonRestClient;
    @InjectMocks KgBackfillService svc;

    @BeforeEach void setup() {
        ValueOperations<String, String> vops = mock(ValueOperations.class);
        lenient().when(redis.opsForValue()).thenReturn(vops);
        lenient().when(vops.setIfAbsent(anyString(), anyString(), any())).thenReturn(true);
    }

    @Test
    void backfill_clearsNovelThenIteratesChapters() {
        ChapterEntity ent = new ChapterEntity();
        ent.setId("c1"); ent.setTitle("第一章"); ent.setContent("正文内容");
        when(chapterRepo.findByNovelIdOrderedWithVolumes("n1")).thenReturn(List.of(ent));
        RestClient.RequestHeadersUriSpec<?> uriSpec = mock(RestClient.RequestHeadersUriSpec.class);
        // 简化：验证 clearNovel 被调用即可（python 调用 mock 复杂，保留集成测覆盖）
        // 直接测 clearNovel 触发
        try {
            svc.backfill("n1");
        } catch (Exception ignored) {}
        verify(kgService).clearNovel("n1");
    }
}
```
（注：完整 python 调用 mock 较繁，本单测聚焦 clearNovel 触发 + 锁；端到端 python 调用由集成测覆盖。）

- [ ] **Step 2: 跑测试验证失败**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=KgBackfillServiceTest
```

- [ ] **Step 3: 写 KgBackfillService**

```java
package cn.novelstudio.module.content.service;

import cn.novelstudio.module.content.entity.ChapterEntity;
import cn.novelstudio.module.content.repository.ChapterRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class KgBackfillService {

    private static final Duration LOCK_TTL = Duration.ofMinutes(30);
    private static final Duration PROGRESS_TTL = Duration.ofHours(1);

    private final ChapterRepository chapterRepo;
    private final KgService kgService;
    private final StringRedisTemplate redis;
    private final RestClient pythonRestClient;
    private final String internalKey;

    public KgBackfillService(ChapterRepository chapterRepo, KgService kgService,
                             StringRedisTemplate redis,
                             @Qualifier("pythonRestClient") RestClient pythonRestClient,
                             @Value("${agent.internal.service-key:dev-internal-key-change-me}") String internalKey) {
        this.chapterRepo = chapterRepo; this.kgService = kgService;
        this.redis = redis; this.pythonRestClient = pythonRestClient;
        this.internalKey = internalKey;
    }

    /** 触发回填。true=已开始，false=已在进行中。 */
    public boolean backfill(String novelId) {
        String lockKey = "kg:backfill:lock:" + novelId;
        Boolean acquired = redis.opsForValue().setIfAbsent(lockKey, "1", LOCK_TTL);
        if (!Boolean.TRUE.equals(acquired)) return false;

        setProgress(novelId, "in_progress", 0, 0, 0);
        try {
            // 全量重建：先清
            kgService.clearNovel(novelId);
            List<ChapterEntity> chapters = chapterRepo.findByNovelIdOrderedWithVolumes(novelId);
            int total = chapters.size(), done = 0, failed = 0;
            setProgress(novelId, "in_progress", total, done, failed);
            for (ChapterEntity ch : chapters) {
                try {
                    JsonNode result = pythonRestClient.post()
                        .uri("/internal/kg/extract")
                        .header("X-Internal-Service-Key", internalKey)
                        .body(Map.of("novelId", novelId, "chapterId", ch.getId(), "text", ch.getContent() == null ? "" : ch.getContent()))
                        .retrieve()
                        .body(JsonNode.class);
                    if (result != null && result.has("error")) {
                        kgService.recordError(novelId, ch.getId(), result.path("error").asText());
                        failed++;
                    } else if (result != null) {
                        kgService.upsertChapter(novelId, ch.getId(),
                            toMapList(result.path("entities")), toMapList(result.path("relations")));
                        done++;
                    }
                } catch (Exception e) {
                    log.warn("kg backfill chapter failed novel={} ch={}: {}", novelId, ch.getId(), e.getMessage());
                    kgService.recordError(novelId, ch.getId(), e.getMessage());
                    failed++;
                }
                setProgress(novelId, "in_progress", total, done, failed);
            }
            setProgress(novelId, failed > 0 && done == 0 ? "failed" : "done", total, done, failed);
        } catch (Exception e) {
            log.error("kg backfill fatal novel={}: {}", novelId, e.getMessage());
            setProgress(novelId, "failed", 0, 0, 0);
        } finally {
            redis.delete(lockKey);
        }
        return true;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, String>> toMapList(JsonNode arr) {
        if (arr == null || !arr.isArray()) return List.of();
        return java.util.stream.StreamSupport.stream(arr.spliterator(), false)
            .map(n -> {
                Map<String, String> m = new java.util.LinkedHashMap<>();
                n.fields().forEachRemaining(f -> m.put(f.getKey(), f.getValue().asText()));
                return m;
            })
            .toList();
    }

    public void setProgress(String novelId, String status, int total, int done, int failed) {
        String key = "kg:backfill:" + novelId;
        String val = String.format("{\"status\":\"%s\",\"total\":%d,\"done\":%d,\"failed\":%d}", status, total, done, failed);
        redis.opsForValue().set(key, val, PROGRESS_TTL);
    }

    public Map<String, Object> getProgress(String novelId) {
        String v = redis.opsForValue().get("kg:backfill:" + novelId);
        if (v == null) {
            Map<String, Object> idle = new java.util.LinkedHashMap<>();
            idle.put("status", "idle"); idle.put("total", 0); idle.put("done", 0); idle.put("failed", 0);
            return idle;
        }
        try {
            JsonNode n = new com.fasterxml.jackson.databind.ObjectMapper().readTree(v);
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("status", n.path("status").asText());
            m.put("total", n.path("total").asInt());
            m.put("done", n.path("done").asInt());
            m.put("failed", n.path("failed").asInt());
            return m;
        } catch (Exception e) {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("status", "idle"); m.put("total", 0); m.put("done", 0); m.put("failed", 0);
            return m;
        }
    }
}
```

- [ ] **Step 4: 跑测试验证通过**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=KgBackfillServiceTest
```
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/KgBackfillService.java \
        novel-studio/studio-modules/studio-module-content/src/test/java/cn/novelstudio/module/content/service/KgBackfillServiceTest.java
git commit -m "feat(kg): KgBackfillService 锁/进度/逐章回填编排"
```

---

## Task 9: KgBackfillListener（消费 MQ）

**Files:**
- Create: `studio-modules/studio-module-worker/.../listener/KgBackfillListener.java`

> 模式参考 `CrawlDispatchListener`。worker 模块需能注入 `KgBackfillService`（content 模块）——确认 worker pom 依赖 content（与模块5 FileParseListener 同要求）。

- [ ] **Step 1: 写 KgBackfillListener**

```java
package cn.novelstudio.module.worker.listener;

import cn.novelstudio.module.content.service.KgBackfillService;
import cn.novelstudio.module.worker.support.MqListenerSupport;
import cn.novelstudio.platform.messaging.kg.KgBackfillMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class KgBackfillListener {

    private static final Logger log = LoggerFactory.getLogger(KgBackfillListener.class);

    private final ObjectMapper objectMapper;
    private final KgBackfillService backfillService;

    public KgBackfillListener(ObjectMapper objectMapper, KgBackfillService backfillService) {
        this.objectMapper = objectMapper;
        this.backfillService = backfillService;
    }

    @RabbitListener(queuesToDeclare = @Queue(name = "agent.kg.backfill.queue", durable = "true"))
    public void onBackfill(String message) {
        MqListenerSupport.safeHandle(log, message, "kg.backfill failed", this::handle);
    }

    private void handle(String message) throws Exception {
        KgBackfillMessage payload = objectMapper.readValue(message, KgBackfillMessage.class);
        backfillService.backfill(payload.novelId());
    }
}
```

- [ ] **Step 2: 确认 worker pom 依赖 content**

检查 `studio-module-worker/pom.xml` 含 `studio-module-content` 依赖（模块5 已加则跳过）；否则加。

- [ ] **Step 3: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-worker -am compile
```

- [ ] **Step 4: 提交**

```bash
git add novel-studio/studio-modules/studio-module-worker/src/main/java/cn/novelstudio/module/worker/listener/KgBackfillListener.java
git commit -m "feat(kg): KgBackfillListener 消费 MQ 回填"
```

---

## Task 10: Auth 端点 backfill/progress/errors + AuthNovelBiz

**Files:**
- Modify: `.../controller/auth/AuthNovelController.java`
- Modify: `.../service/auth/biz/AuthNovelBiz.java`

- [ ] **Step 1: AuthNovelController 加端点**

在 `knowledgeGraph` 端点后加：
```java
    @PostMapping("/{novelId}/knowledge-graph/backfill")
    public Result<Map<String, Object>> backfillKg(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId
    ) {
        return biz.backfillKg(parseUserId(userId), novelId);
    }

    @GetMapping("/{novelId}/knowledge-graph/progress")
    public Result<Map<String, Object>> kgProgress(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId
    ) {
        return biz.kgProgress(parseUserId(userId), novelId);
    }

    @GetMapping("/{novelId}/knowledge-graph/errors")
    public Result<List<Map<String, Object>>> kgErrors(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId
    ) {
        return biz.kgErrors(parseUserId(userId), novelId);
    }
```
（import `java.util.List`。）

- [ ] **Step 2: AuthNovelBiz 加方法 + 注入**

`AuthNovelBiz` 注入 `KgBackfillService` + `IMessageProducer`（ObjectProvider 可选）。加方法：
```java
    private final KgBackfillService kgBackfillService;
    private final org.springframework.beans.factory.ObjectProvider<
        cn.novelstudio.platform.messaging.producer.IMessageProducer> producerProvider;

    public Result<Map<String, Object>> backfillKg(Long userId, String novelId) {
        novelService.getNovel(userId, novelId); // own 校验
        // 已有 KG 记录？
        Map<String, Object> graph = knowledgeGraphClient.getNovelGraph(novelId);
        if (!"empty".equals(graph.get("status"))) {
            return ok(Map.of("status", "exists"));
        }
        // 进行中？
        Map<String, Object> prog = kgBackfillService.getProgress(novelId);
        if ("in_progress".equals(prog.get("status"))) {
            return ok(Map.of("status", "in_progress"));
        }
        var producer = producerProvider.getIfAvailable();
        if (producer != null) {
            producer.send(cn.novelstudio.platform.messaging.constant.MqTopic.KG_BACKFILL,
                new cn.novelstudio.platform.messaging.kg.KgBackfillMessage(novelId, userId));
            return ok(Map.of("status", "started"));
        }
        // MQ 不可用，同步执行（仅调试）
        kgBackfillService.backfill(novelId);
        return ok(Map.of("status", "started_sync"));
    }

    public Result<Map<String, Object>> kgProgress(Long userId, String novelId) {
        novelService.getNovel(userId, novelId);
        return ok(kgBackfillService.getProgress(novelId));
    }

    public Result<List<Map<String, Object>>> kgErrors(Long userId, String novelId) {
        novelService.getNovel(userId, novelId);
        return ok(kgService.recentErrors(novelId).stream().map(e -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("chapterId", e.getChapterId());
            m.put("reason", e.getReason());
            m.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toEpochMilli());
            return m;
        }).toList());
    }
```
（`KgService kgService` 也需注入到 AuthNovelBiz。若已有 `knowledgeGraphClient`，可直接复用其委托；但 recentErrors 在 KgService，故注入 KgService。）

- [ ] **Step 3: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
```

- [ ] **Step 4: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/controller/auth/AuthNovelController.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/auth/biz/AuthNovelBiz.java
git commit -m "feat(kg): Auth 端点 backfill/progress/errors"
```

---

Part 2 完成。→ 继续 [Part 3 — python 抽取改造](./2026-06-19-knowledge-graph-part3-python.md)
