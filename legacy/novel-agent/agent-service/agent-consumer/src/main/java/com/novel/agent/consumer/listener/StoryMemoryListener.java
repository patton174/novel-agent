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
public class StoryMemoryListener {

    private static final Logger log = LoggerFactory.getLogger(StoryMemoryListener.class);

    private final ObjectMapper objectMapper;
    private final ContentRestSupport contentRestSupport;

    public StoryMemoryListener(ObjectMapper objectMapper, ContentRestSupport contentRestSupport) {
        this.objectMapper = objectMapper;
        this.contentRestSupport = contentRestSupport;
    }

    @RabbitListener(queuesToDeclare = @Queue(name = "agent.story-memory.queue", durable = "true"))
    public void onPersistStoryMemory(String message) {
        MqListenerSupport.safeHandle(log, message, "持久化故事记忆失败", this::handle);
    }

    private void handle(String message) throws Exception {
        JsonNode payload = objectMapper.readTree(message);
        long userId = payload.path("user_id").asLong(0L);
        String novelId = payload.path("novel_id").asText("");
        String sessionId = payload.path("session_id").asText("");
        String patchScope = payload.path("patch_scope").asText("");
        if (userId <= 0) {
            return;
        }
        if (!novelId.isBlank()) {
            if (!patchScope.isBlank()) {
                String patchItemId = payload.path("patch_item_id").asText("");
                JsonNode bucketNode = payload.path("patch_bucket");
                if (!bucketNode.isObject()) {
                    return;
                }
                Map<String, Object> bucket = jsonObjectToMap(bucketNode);
                contentRestSupport.postAuth(
                    "/api/content/auth/novels/{novelId}/story-memory/internal/persist-scope-patch",
                    userId,
                    Map.of(
                        "scope", patchScope,
                        "itemId", patchItemId.isBlank() ? null : patchItemId,
                        "bucket", bucket
                    ),
                    novelId
                );
                log.info(
                    "小说记忆 scope patch 已持久化到 PostgreSQL: userId={}, novelId={}, scope={}",
                    userId,
                    novelId,
                    patchScope
                );
                return;
            }
            JsonNode memoryNode = payload.path("memory");
            if (!memoryNode.isObject()) {
                return;
            }
            Map<String, Object> memory = jsonObjectToMap(memoryNode);
            contentRestSupport.postAuth(
                "/api/content/auth/novels/{novelId}/story-memory/internal/persist",
                userId,
                Map.of("memory", memory),
                novelId
            );
            log.info("小说记忆已持久化到 PostgreSQL: userId={}, novelId={}", userId, novelId);
            return;
        }
        if (sessionId.isBlank()) {
            return;
        }
        JsonNode memoryNode = payload.path("memory");
        if (!memoryNode.isObject()) {
            return;
        }
        Map<String, Object> memory = jsonObjectToMap(memoryNode);
        contentRestSupport.postAuth(
            "/api/content/auth/sessions/{sessionId}/story-memory/internal/persist",
            userId,
            Map.of("memory", memory),
            sessionId
        );
        log.info("故事记忆已持久化到 PostgreSQL: userId={}, sessionId={}", userId, sessionId);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> jsonObjectToMap(JsonNode node) {
        return objectMapper.convertValue(node, Map.class);
    }
}
