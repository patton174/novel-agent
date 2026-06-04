package com.novel.agent.consumer.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class AgentSessionListener {

    private static final Logger log = LoggerFactory.getLogger(AgentSessionListener.class);

    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public AgentSessionListener(
        ObjectMapper objectMapper,
        @Value("${agent.content.base-url:http://127.0.0.1:8091}") String contentBaseUrl
    ) {
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().baseUrl(contentBaseUrl).build();
    }

    @RabbitListener(queuesToDeclare = @Queue(name = "agent.session.queue", durable = "true"))
    public void onPersistSession(String message) {
        try {
            JsonNode payload = objectMapper.readTree(message);
            long userId = payload.path("user_id").asLong(0L);
            String sessionId = payload.path("session_id").asText("");
            String runId = payload.path("run_id").asText("");
            String messageId = payload.path("message_id").asText("");
            String mode = "auto";
            String userMessage = payload.path("user_message").asText("");
            String assistantMessage = payload.path("assistant_message").asText("");

            if (userId <= 0 || sessionId.isBlank()) {
                return;
            }
            upsertSession(userId, sessionId, userMessage);
            if (!userMessage.isBlank()) {
                append(userId, sessionId, "user", userMessage, runId, messageId + ":user", mode);
            }
            if (!assistantMessage.isBlank()) {
                append(userId, sessionId, "assistant", assistantMessage, runId, messageId + ":assistant", mode);
            }
            log.info("会话已持久化到 content: userId={}, sessionId={}, runId={}, messageId={}", userId, sessionId, runId, messageId);
        } catch (Exception ex) {
            log.error("持久化会话消息失败: {}", message, ex);
        }
    }

    private void upsertSession(long userId, String sessionId, String seed) {
        String title = seed == null || seed.isBlank() ? "新对话" : (seed.length() > 18 ? seed.substring(0, 18) + "..." : seed);
        restClient.post()
            .uri("/api/content/sessions/upsert")
            .contentType(MediaType.APPLICATION_JSON)
            .header("X-User-Id", Long.toString(userId))
            .body(Map.of("sessionId", sessionId, "title", title))
            .retrieve()
            .toBodilessEntity();
    }

    private void append(long userId, String sessionId, String role, String content, String runId, String messageId, String mode) {
        restClient.post()
            .uri("/api/content/sessions/{sessionId}/messages", sessionId)
            .contentType(MediaType.APPLICATION_JSON)
            .header("X-User-Id", Long.toString(userId))
            .body(Map.of(
                "sessionId", sessionId,
                "role", role,
                "content", content,
                "runId", runId == null ? "" : runId,
                "messageId", messageId == null ? "" : messageId,
                "mode", "auto"
            ))
            .retrieve()
            .toBodilessEntity();
    }
}
