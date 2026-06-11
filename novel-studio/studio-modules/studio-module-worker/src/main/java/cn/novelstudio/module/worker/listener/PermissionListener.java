package cn.novelstudio.module.worker.listener;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.platform.messaging.dto.PermissionSyncMessage;
import cn.novelstudio.platform.security.SecurityRedisKeys;
import cn.novelstudio.module.worker.support.MqListenerSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class PermissionListener {

    private static final Logger log = LoggerFactory.getLogger(PermissionListener.class);
    private static final Duration ROLE_TTL = Duration.ofDays(7);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public PermissionListener(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    @RabbitListener(queuesToDeclare = @org.springframework.amqp.rabbit.annotation.Queue(name = "permission.queue", durable = "true"))
    public void handlePermissionSync(String message) {
        MqListenerSupport.safeHandle(log, message, "处理权限同步消息失败", this::handle);
    }

    private void handle(String message) throws Exception {
        log.info("收到权限同步消息: {}", message);
        PermissionSyncMessage payload = parseMessage(message);
        if (payload.userId() == null) {
            log.warn("权限同步消息缺少 userId: {}", message);
            return;
        }
        String role = payload.role() == null || payload.role().isBlank() ? "user" : payload.role().trim();
        redisTemplate.opsForValue().set(
            SecurityRedisKeys.USER_ROLE_PREFIX + payload.userId(),
            role,
            ROLE_TTL
        );
        log.info("角色已存入 Redis: userId={}, role={}", payload.userId(), role);
    }

    private PermissionSyncMessage parseMessage(String message) throws Exception {
        String trimmed = message == null ? "" : message.trim();
        if (trimmed.startsWith("{")) {
            JsonNode node = objectMapper.readTree(trimmed);
            Long userId = node.hasNonNull("userId") ? node.get("userId").asLong() : null;
            String role = node.has("role") && !node.get("role").isNull() ? node.get("role").asText() : "user";
            return new PermissionSyncMessage(userId, role);
        }
        return new PermissionSyncMessage(Long.parseLong(trimmed), "user");
    }
}
