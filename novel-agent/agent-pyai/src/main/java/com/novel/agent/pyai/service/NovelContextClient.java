package com.novel.agent.pyai.service;

import com.novel.agent.common.core.support.ResultJsonSupport;
import com.novel.agent.pyai.support.BlockingWebSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class NovelContextClient {

    private static final Logger log = LoggerFactory.getLogger(NovelContextClient.class);
    private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(15);

    private final WebClient contentClient;
    private final BlockingWebSupport blockingWebSupport;

    public NovelContextClient(
        @Qualifier("contentWebClient") WebClient contentClient,
        BlockingWebSupport blockingWebSupport
    ) {
        this.contentClient = contentClient;
        this.blockingWebSupport = blockingWebSupport;
    }

    public Map<String, Object> fetchAgentContext(Long userId, String novelId, String chapterId) {
        if (novelId == null || novelId.isBlank()) {
            return Map.of();
        }
        try {
            return blockingWebSupport.call(() -> fetchAgentContextBlocking(userId, novelId, chapterId));
        } catch (Exception ex) {
            log.warn(
                "fetchAgentContext failed userId={} novelId={} chapterId={}: {}",
                userId,
                novelId,
                chapterId,
                ex.getMessage()
            );
            return fallbackProjectContext(userId, novelId);
        }
    }

    private Map<String, Object> fetchAgentContextBlocking(Long userId, String novelId, String chapterId) {
        @SuppressWarnings("unchecked")
        Map<String, Object> body = contentClient.get()
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
            .bodyToMono(Map.class)
            .timeout(HTTP_TIMEOUT)
            .block();
        if (body == null || body.isEmpty()) {
            log.warn("fetchAgentContext empty body userId={} novelId={}", userId, novelId);
            return fallbackProjectContext(userId, novelId);
        }
        return ResultJsonSupport.unwrap(body);
    }

    private Map<String, Object> fallbackProjectContext(Long userId, String novelId) {
        try {
            return blockingWebSupport.call(() -> fallbackProjectContextBlocking(userId, novelId));
        } catch (Exception ex) {
            log.warn("fetchAgentContext fallback failed userId={} novelId={}: {}", userId, novelId, ex.getMessage());
            return Map.of();
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fallbackProjectContextBlocking(Long userId, String novelId) {
        Map<String, Object> result = contentClient.get()
            .uri("/api/content/auth/novels")
            .header("X-User-Id", String.valueOf(userId))
            .retrieve()
            .bodyToMono(Map.class)
            .timeout(HTTP_TIMEOUT)
            .block();
        List<Map<String, Object>> novels = result == null ? null : ResultJsonSupport.unwrap(result);
        if (novels == null) {
            return Map.of();
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
        return Map.of();
    }
}
