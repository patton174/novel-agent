package cn.novelstudio.module.content.service;

import cn.novelstudio.module.content.entity.ChapterEntity;
import cn.novelstudio.module.content.repository.ChapterRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.StreamSupport;

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

    public KgBackfillService(
        ChapterRepository chapterRepo,
        KgService kgService,
        StringRedisTemplate redis,
        @Qualifier("pythonRestClient") RestClient pythonRestClient,
        @Value("${agent.internal.service-key:dev-internal-key-change-me}") String internalKey
    ) {
        this.chapterRepo = chapterRepo;
        this.kgService = kgService;
        this.redis = redis;
        this.pythonRestClient = pythonRestClient;
        this.internalKey = internalKey;
    }

    /** 触发回填。true=已开始，false=已在进行中。 */
    public boolean backfill(String novelId) {
        String lockKey = "kg:backfill:lock:" + novelId;
        Boolean acquired = redis.opsForValue().setIfAbsent(lockKey, "1", LOCK_TTL);
        if (!Boolean.TRUE.equals(acquired)) {
            return false;
        }

        setProgress(novelId, "in_progress", 0, 0, 0);
        try {
            kgService.clearNovel(novelId);
            List<ChapterEntity> chapters = chapterRepo.findByNovelIdOrderedWithVolumes(novelId);
            int total = chapters.size();
            int done = 0;
            int failed = 0;
            setProgress(novelId, "in_progress", total, done, failed);
            for (ChapterEntity ch : chapters) {
                try {
                    JsonNode result = pythonRestClient.post()
                        .uri("/internal/kg/extract")
                        .header("X-Internal-Service-Key", internalKey)
                        .body(Map.of(
                            "novelId", novelId,
                            "chapterId", ch.getId(),
                            "text", ch.getContent() == null ? "" : ch.getContent()
                        ))
                        .retrieve()
                        .body(JsonNode.class);
                    if (result != null && result.has("error")) {
                        kgService.recordError(novelId, ch.getId(), result.path("error").asText());
                        failed++;
                    } else if (result != null) {
                        kgService.upsertChapter(
                            novelId,
                            ch.getId(),
                            toMapList(result.path("entities")),
                            toMapList(result.path("relations"))
                        );
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

    private List<Map<String, String>> toMapList(JsonNode arr) {
        if (arr == null || !arr.isArray()) {
            return List.of();
        }
        return StreamSupport.stream(arr.spliterator(), false)
            .map(n -> {
                Map<String, String> m = new LinkedHashMap<>();
                n.fields().forEachRemaining(f -> m.put(f.getKey(), f.getValue().asText()));
                return m;
            })
            .toList();
    }

    public void setProgress(String novelId, String status, int total, int done, int failed) {
        String key = "kg:backfill:" + novelId;
        String val = String.format(
            "{\"status\":\"%s\",\"total\":%d,\"done\":%d,\"failed\":%d}",
            status, total, done, failed
        );
        redis.opsForValue().set(key, val, PROGRESS_TTL);
    }

    public Map<String, Object> getProgress(String novelId) {
        String v = redis.opsForValue().get("kg:backfill:" + novelId);
        if (v == null) {
            Map<String, Object> idle = new LinkedHashMap<>();
            idle.put("status", "idle");
            idle.put("total", 0);
            idle.put("done", 0);
            idle.put("failed", 0);
            return idle;
        }
        try {
            JsonNode n = new ObjectMapper().readTree(v);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("status", n.path("status").asText());
            m.put("total", n.path("total").asInt());
            m.put("done", n.path("done").asInt());
            m.put("failed", n.path("failed").asInt());
            return m;
        } catch (Exception e) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("status", "idle");
            m.put("total", 0);
            m.put("done", 0);
            m.put("failed", 0);
            return m;
        }
    }
}
