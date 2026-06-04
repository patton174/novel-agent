package com.novel.agent.consumer.listener;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class StoryMemoryListener {

    private static final Logger log = LoggerFactory.getLogger(StoryMemoryListener.class);

    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public StoryMemoryListener(
        ObjectMapper objectMapper,
        @Value("${agent.content.base-url:http://127.0.0.1:8091}") String contentBaseUrl
    ) {
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().baseUrl(contentBaseUrl).build();
    }

    @RabbitListener(queuesToDeclare = @Queue(name = "agent.story-memory.queue", durable = "true"))
    public void onPersistStoryMemory(String message) {
        try {
            JsonNode payload = objectMapper.readTree(message);
            long userId = payload.path("user_id").asLong(0L);
            String novelId = payload.path("novel_id").asText("");
            String sessionId = payload.path("session_id").asText("");
            JsonNode memoryNode = payload.path("memory");
            if (userId <= 0 || memoryNode.isMissingNode() || !memoryNode.isObject()) {
                return;
            }
            Map<String, Object> memory = jsonObjectToMap(memoryNode);
            if (!novelId.isBlank()) {
                restClient.post()
                    .uri("/api/content/novels/{novelId}/story-memory/internal/persist", novelId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-User-Id", Long.toString(userId))
                    .body(Map.of("memory", memory))
                    .retrieve()
                    .toBodilessEntity();
                log.info("小说记忆已持久化到 PostgreSQL: userId={}, novelId={}", userId, novelId);
                return;
            }
            if (sessionId.isBlank()) {
                return;
            }
            restClient.post()
                .uri("/api/content/sessions/{sessionId}/story-memory/internal/persist", sessionId)
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-User-Id", Long.toString(userId))
                .body(Map.of("memory", memory))
                .retrieve()
                .toBodilessEntity();
            log.info("故事记忆已持久化到 PostgreSQL: userId={}, sessionId={}", userId, sessionId);
        } catch (Exception ex) {
            log.error("持久化故事记忆失败: {}", message, ex);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> jsonObjectToMap(JsonNode node) {
        return objectMapper.convertValue(node, Map.class);
    }
}
