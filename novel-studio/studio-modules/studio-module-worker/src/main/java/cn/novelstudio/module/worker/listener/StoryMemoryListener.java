package cn.novelstudio.module.worker.listener;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.module.content.dto.PersistStoryMemoryRequest;
import cn.novelstudio.module.content.dto.PersistStoryMemoryScopePatchRequest;
import cn.novelstudio.module.content.service.auth.biz.AuthStoryMemoryBiz;
import cn.novelstudio.module.worker.support.MqListenerSupport;
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
    private final AuthStoryMemoryBiz storyMemoryBiz;

    public StoryMemoryListener(ObjectMapper objectMapper, AuthStoryMemoryBiz storyMemoryBiz) {
        this.objectMapper = objectMapper;
        this.storyMemoryBiz = storyMemoryBiz;
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
                storyMemoryBiz.persistNovelColdScopePatch(
                    userId,
                    novelId,
                    new PersistStoryMemoryScopePatchRequest(
                        patchScope,
                        patchItemId.isBlank() ? null : patchItemId,
                        bucket
                    )
                );
                log.info("小说记忆 scope patch 已持久化: userId={}, novelId={}, scope={}", userId, novelId, patchScope);
                return;
            }
            JsonNode memoryNode = payload.path("memory");
            if (!memoryNode.isObject()) {
                return;
            }
            storyMemoryBiz.persistNovelCold(userId, novelId, new PersistStoryMemoryRequest(jsonObjectToMap(memoryNode)));
            log.info("小说记忆已持久化: userId={}, novelId={}", userId, novelId);
            return;
        }
        if (sessionId.isBlank()) {
            return;
        }
        JsonNode memoryNode = payload.path("memory");
        if (!memoryNode.isObject()) {
            return;
        }
        storyMemoryBiz.persistSessionCold(userId, sessionId, new PersistStoryMemoryRequest(jsonObjectToMap(memoryNode)));
        log.info("故事记忆已持久化: userId={}, sessionId={}", userId, sessionId);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> jsonObjectToMap(JsonNode node) {
        return objectMapper.convertValue(node, Map.class);
    }
}
