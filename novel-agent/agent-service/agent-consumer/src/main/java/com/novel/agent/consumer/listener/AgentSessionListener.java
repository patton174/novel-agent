package com.novel.agent.consumer.listener;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.consumer.support.ContentRestSupport;
import com.novel.agent.consumer.support.MqListenerSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class AgentSessionListener {

    private static final Logger log = LoggerFactory.getLogger(AgentSessionListener.class);

    private final ObjectMapper objectMapper;
    private final ContentRestSupport contentRestSupport;

    public AgentSessionListener(ObjectMapper objectMapper, ContentRestSupport contentRestSupport) {
        this.objectMapper = objectMapper;
        this.contentRestSupport = contentRestSupport;
    }

    @RabbitListener(queuesToDeclare = @Queue(name = "agent.session.queue", durable = "true"))
    public void onPersistSession(String message) {
        MqListenerSupport.safeHandle(log, message, "持久化会话消息失败", this::handle);
    }

    private void handle(String message) throws Exception {
        JsonNode payload = objectMapper.readTree(message);
        long userId = payload.path("user_id").asLong(0L);
        String sessionId = payload.path("session_id").asText("");
        String runId = payload.path("run_id").asText("");
        String messageId = payload.path("message_id").asText("");
        String userMessage = payload.path("user_message").asText("");
        String assistantMessage = payload.path("assistant_message").asText("");

        if (userId <= 0 || sessionId.isBlank()) {
            return;
        }
        upsertSession(userId, sessionId, userMessage);
        if (!userMessage.isBlank()) {
            append(userId, sessionId, "user", userMessage, runId, messageId + ":user");
        }
        if (!assistantMessage.isBlank()) {
            append(userId, sessionId, "assistant", assistantMessage, runId, messageId + ":assistant");
        }
        log.info("会话已持久化到 content: userId={}, sessionId={}, runId={}, messageId={}", userId, sessionId, runId, messageId);
    }

    private void upsertSession(long userId, String sessionId, String seed) {
        String title = seed == null || seed.isBlank() ? "新对话" : (seed.length() > 18 ? seed.substring(0, 18) + "..." : seed);
        contentRestSupport.postAuth(
            "/api/content/auth/sessions/upsert",
            userId,
            Map.of("sessionId", sessionId, "title", title)
        );
    }

    private void append(long userId, String sessionId, String role, String content, String runId, String messageId) {
        contentRestSupport.postAuth(
            "/api/content/auth/sessions/{sessionId}/messages",
            userId,
            Map.of(
                "sessionId", sessionId,
                "role", role,
                "content", content,
                "runId", runId == null ? "" : runId,
                "messageId", messageId == null ? "" : messageId,
                "mode", "auto"
            ),
            sessionId
        );
    }
}
