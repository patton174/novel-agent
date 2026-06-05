package com.novel.agent.pyai.service;

import com.novel.agent.common.core.support.ResultJsonSupport;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class AgentSessionMemoryService {

    private static final int DEFAULT_LIMIT = 24;
    private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(15);

    private final WebClient contentClient;

    public AgentSessionMemoryService(
        @Qualifier("contentWebClient") WebClient contentClient
    ) {
        this.contentClient = contentClient;
    }

    public List<HistoryTurn> loadHistory(Long userId, String sessionId, int limit) {
        if (userId == null || userId <= 0 || sessionId == null || sessionId.isBlank()) {
            return List.of();
        }
        try {
            return loadHistoryBlocking(userId, sessionId, limit);
        } catch (Exception ex) {
            return List.of();
        }
    }

    private List<HistoryTurn> loadHistoryBlocking(Long userId, String sessionId, int limit) {
        int effectiveLimit = limit > 0 ? limit : DEFAULT_LIMIT;
        Map<String, Object> itemsBody = contentClient.get()
            .uri(uriBuilder -> uriBuilder.path("/api/content/auth/sessions/{sessionId}/messages")
                .queryParam("limit", effectiveLimit)
                .build(sessionId))
            .accept(MediaType.APPLICATION_JSON)
            .header("X-User-Id", Long.toString(userId))
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
            .timeout(HTTP_TIMEOUT)
            .block();
        List<Map<String, Object>> items = itemsBody == null ? null : ResultJsonSupport.unwrap(itemsBody);
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        List<HistoryTurn> turns = new ArrayList<>();
        for (Map<String, Object> item : items) {
            HistoryTurn turn = parseMessage(item);
            if (turn != null) {
                turns.add(turn);
            }
        }
        return turns;
    }

    public String getSessionTitle(Long userId, String sessionId) {
        if (userId == null || userId <= 0 || sessionId == null || sessionId.isBlank()) {
            return "新对话";
        }
        try {
            Map<String, Object> body = contentClient.get()
                .uri("/api/content/auth/sessions/{sessionId}", sessionId)
                .accept(MediaType.APPLICATION_JSON)
                .header("X-User-Id", Long.toString(userId))
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .timeout(HTTP_TIMEOUT)
                .block();
            if (body == null) {
                return "新对话";
            }
            Map<String, Object> session = ResultJsonSupport.unwrap(body);
            Object title = session.get("title");
            return title == null ? "新对话" : String.valueOf(title).trim();
        } catch (Exception ex) {
            return "新对话";
        }
    }

    public boolean isSessionOwnedByUser(Long userId, String sessionId) {
        if (userId == null || userId <= 0 || sessionId == null || sessionId.isBlank()) {
            return false;
        }
        try {
            return isSessionOwnedByUserBlocking(userId, sessionId);
        } catch (Exception ex) {
            return false;
        }
    }

    private boolean isSessionOwnedByUserBlocking(Long userId, String sessionId) {
        Map<String, Object> sessionsBody = contentClient.get()
            .uri(uriBuilder -> uriBuilder.path("/api/content/auth/sessions").queryParam("limit", 200).build())
            .accept(MediaType.APPLICATION_JSON)
            .header("X-User-Id", Long.toString(userId))
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
            .timeout(HTTP_TIMEOUT)
            .block();
        List<Map<String, Object>> sessions = sessionsBody == null ? null : ResultJsonSupport.unwrap(sessionsBody);
        if (sessions == null) {
            return false;
        }
        return sessions.stream().anyMatch(s -> sessionId.equals(String.valueOf(s.get("id"))));
    }

    public void ensureSession(Long userId, String sessionId, String seedTitle) {
        if (userId == null || userId <= 0 || sessionId == null || sessionId.isBlank()) {
            return;
        }
        try {
            ensureSessionBlocking(userId, sessionId, seedTitle);
        } catch (Exception ignored) {
            // best effort
        }
    }

    private void ensureSessionBlocking(Long userId, String sessionId, String seedTitle) {
        String title = inferTitle(seedTitle);
        contentClient.post()
            .uri("/api/content/auth/sessions/upsert")
            .contentType(MediaType.APPLICATION_JSON)
            .header("X-User-Id", Long.toString(userId))
            .bodyValue(Map.of("sessionId", sessionId, "title", title))
            .retrieve()
            .toBodilessEntity()
            .timeout(HTTP_TIMEOUT)
            .block();
    }

    public void appendTurns(Long userId, String sessionId, String userMessage, String assistantMessage) {
        // 迁移到 content + MQ 异步持久化后，此方法保留以兼容旧调用，不再直接写 Redis。
    }

    private String inferTitle(String content) {
        if (content == null || content.isBlank()) {
            return "新对话";
        }
        String clean = content.replaceAll("\\s+", " ").trim();
        return clean.length() > 18 ? clean.substring(0, 18) + "..." : clean;
    }

    private HistoryTurn parseMessage(Map<String, Object> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }
        Object role = item.get("role");
        Object content = item.get("content");
        HistoryTurn turn = new HistoryTurn(
            role == null ? "" : String.valueOf(role),
            content == null ? "" : String.valueOf(content)
        );
        return turn.isValid() ? turn : null;
    }

    public record HistoryTurn(String role, String content) {
        public HistoryTurn {
            role = role == null ? "" : role.trim();
            content = content == null ? "" : content.trim();
        }
        public boolean isValid() {
            return ("user".equals(role) || "assistant".equals(role)) && !content.isBlank();
        }
    }
}
