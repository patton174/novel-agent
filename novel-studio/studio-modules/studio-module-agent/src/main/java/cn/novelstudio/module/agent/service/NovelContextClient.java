package cn.novelstudio.module.agent.service;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.content.dto.NovelDTO;
import cn.novelstudio.module.content.service.auth.biz.AuthNovelAgentContextBiz;
import cn.novelstudio.module.content.service.auth.biz.AuthNovelBiz;
import cn.novelstudio.module.content.service.internal.InternalAgentRunContextBiz;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class NovelContextClient {

    private static final Logger log = LoggerFactory.getLogger(NovelContextClient.class);

    private final InternalAgentRunContextBiz runContextBiz;
    private final AuthNovelAgentContextBiz novelAgentContextBiz;
    private final AuthNovelBiz novelBiz;

    public NovelContextClient(
        InternalAgentRunContextBiz runContextBiz,
        AuthNovelAgentContextBiz novelAgentContextBiz,
        AuthNovelBiz novelBiz
    ) {
        this.runContextBiz = runContextBiz;
        this.novelAgentContextBiz = novelAgentContextBiz;
        this.novelBiz = novelBiz;
    }

    public Map<String, Object> fetchRunContextAggregate(
        Long userId,
        String novelId,
        String chapterId,
        String sessionId
    ) {
        return fetchRunContextAggregateMono(userId, novelId, chapterId, sessionId)
            .blockOptional()
            .orElse(Map.of());
    }

    public Mono<Map<String, Object>> fetchRunContextAggregateMono(
        Long userId,
        String novelId,
        String chapterId,
        String sessionId
    ) {
        if (novelId == null || novelId.isBlank() || userId == null || userId <= 0) {
            return Mono.just(Map.of());
        }
        return Mono.fromCallable(() -> runContextBiz.aggregate(userId, novelId, chapterId, sessionId))
            .subscribeOn(Schedulers.boundedElastic())
            .onErrorResume(ex -> {
                log.warn(
                    "fetchRunContextAggregate failed userId={} novelId={}: {}",
                    userId,
                    novelId,
                    ex.getMessage()
                );
                return fetchAgentContextMono(userId, novelId, chapterId);
            });
    }

    public Map<String, Object> fetchAgentContext(Long userId, String novelId, String chapterId) {
        return fetchAgentContextMono(userId, novelId, chapterId)
            .blockOptional()
            .orElse(Map.of());
    }

    public Mono<Map<String, Object>> fetchAgentContextMono(Long userId, String novelId, String chapterId) {
        if (novelId == null || novelId.isBlank()) {
            return Mono.just(Map.of());
        }
        return Mono.fromCallable(() -> loadAgentContext(userId, novelId, chapterId))
            .subscribeOn(Schedulers.boundedElastic())
            .flatMap(body -> body.isEmpty() ? fallbackProjectContextMono(userId, novelId) : Mono.just(body))
            .onErrorResume(ex -> {
                log.warn(
                    "fetchAgentContext failed userId={} novelId={} chapterId={}: {}",
                    userId,
                    novelId,
                    chapterId,
                    ex.getMessage()
                );
                return fallbackProjectContextMono(userId, novelId);
            });
    }

    private Map<String, Object> loadAgentContext(Long userId, String novelId, String chapterId) {
        Result<Map<String, Object>> result = novelAgentContextBiz.buildContext(userId, novelId, chapterId);
        return result == null || result.data() == null ? Map.of() : result.data();
    }

    private Mono<Map<String, Object>> fallbackProjectContextMono(Long userId, String novelId) {
        return Mono.fromCallable(() -> buildFallbackContext(userId, novelId))
            .subscribeOn(Schedulers.boundedElastic())
            .onErrorResume(ex -> {
                log.warn("fetchAgentContext fallback failed userId={} novelId={}: {}", userId, novelId, ex.getMessage());
                return Mono.just(Map.of());
            });
    }

    private Map<String, Object> buildFallbackContext(Long userId, String novelId) {
        Result<List<NovelDTO>> novels = novelBiz.list(userId);
        if (novels == null || novels.data() == null) {
            return Map.of();
        }
        for (NovelDTO row : novels.data()) {
            if (row == null || !novelId.equals(row.id())) {
                continue;
            }
            Map<String, Object> project = new HashMap<>();
            project.put("id", row.id());
            project.put("title", row.title());
            project.put("description", row.description());
            project.put("genre", row.genre());
            project.put("style", row.style());
            project.put("target_chapter_words", row.targetChapterWords());
            Map<String, Object> body = new HashMap<>();
            body.put("project", project);
            body.put("volumes", List.of());
            body.put("chapters", List.of());
            body.put("chapter", Map.of());
            body.put("text", "");
            log.info("fetchAgentContext fallback ok userId={} novelId={} title={}", userId, novelId, row.title());
            return body;
        }
        return Map.of();
    }
}
