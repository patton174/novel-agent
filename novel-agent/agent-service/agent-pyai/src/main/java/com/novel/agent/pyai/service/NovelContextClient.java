package com.novel.agent.pyai.service;

import com.novel.agent.common.core.support.ResultJsonSupport;
import com.novel.agent.pyai.config.AgentRuntimeProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class NovelContextClient {

    private static final Logger log = LoggerFactory.getLogger(NovelContextClient.class);
    private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(15);

    private static final String INTERNAL_KEY_HEADER = "X-Internal-Service-Key";

    private final WebClient contentClient;
    private final AgentRuntimeProperties runtimeProperties;

    public NovelContextClient(
        @Qualifier("contentWebClient") WebClient contentClient,
        AgentRuntimeProperties runtimeProperties
    ) {
        this.contentClient = contentClient;
        this.runtimeProperties = runtimeProperties;
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
        return contentClient.post()
            .uri("/internal/agent/run-context")
            .header(INTERNAL_KEY_HEADER, runtimeProperties.internalServiceKey())
            .bodyValue(Map.of(
                "userId", userId,
                "novelId", novelId,
                "chapterId", chapterId == null ? "" : chapterId,
                "sessionId", sessionId == null ? "" : sessionId
            ))
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
            .timeout(HTTP_TIMEOUT)
            .map(body -> body == null ? Map.<String, Object>of() : body)
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
        return contentClient.get()
            .uri(uriBuilder -> {
                var builder = uriBuilder
                    .path("/api/content/auth/novels/{novelId}/agent-context");
                if (chapterId != null && !chapterId.isBlank()) {
                    builder.queryParam("chapterId", chapterId);
                }
                return builder.build(novelId);
            })
            .header("X-User-Id", String.valueOf(userId))
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
            .timeout(HTTP_TIMEOUT)
            .map(body -> {
                if (body == null || body.isEmpty()) {
                    log.warn("fetchAgentContext empty body userId={} novelId={}", userId, novelId);
                    return Map.<String, Object>of();
                }
                return ResultJsonSupport.unwrap(body);
            })
            .flatMap(body -> {
                if (body.isEmpty()) {
                    return fallbackProjectContextMono(userId, novelId);
                }
                return Mono.just(body);
            })
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

    private Mono<Map<String, Object>> fallbackProjectContextMono(Long userId, String novelId) {
        return contentClient.get()
            .uri("/api/content/auth/novels")
            .header("X-User-Id", String.valueOf(userId))
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
            .timeout(HTTP_TIMEOUT)
            .map(result -> {
                List<Map<String, Object>> novels = result == null ? null : ResultJsonSupport.unwrap(result);
                if (novels == null) {
                    return Map.<String, Object>of();
                }
                for (Map<String, Object> row : novels) {
                    if (row == null || !novelId.equals(String.valueOf(row.get("id")))) {
                        continue;
                    }
                    Map<String, Object> project = new HashMap<>();
                    project.put("id", row.get("id"));
                    project.put("title", row.get("title"));
                    project.put("description", row.get("description"));
                    project.put("genre", row.get("genre"));
                    project.put("style", row.get("style"));
                    project.put("target_chapter_words", row.get("targetChapterWords"));
                    Map<String, Object> body = new HashMap<>();
                    body.put("project", project);
                    body.put("volumes", List.of());
                    body.put("chapters", List.of());
                    body.put("chapter", Map.of());
                    body.put("text", "");
                    log.info("fetchAgentContext fallback ok userId={} novelId={} title={}", userId, novelId, row.get("title"));
                    return body;
                }
                return Map.<String, Object>of();
            })
            .onErrorResume(ex -> {
                log.warn("fetchAgentContext fallback failed userId={} novelId={}: {}", userId, novelId, ex.getMessage());
                return Mono.just(Map.of());
            })
            .subscribeOn(Schedulers.boundedElastic());
    }
}
