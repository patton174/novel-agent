package com.novel.agent.consumer.listener;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * 权限同步消息监听器
 */
@Component
public class PermissionListener {

    private static final Logger log = LoggerFactory.getLogger(PermissionListener.class);

    private final StringRedisTemplate redisTemplate;

    public PermissionListener(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    private static final String PERMISSION_KEY_PREFIX = "user:permissions:";
    private static final String ROLE_KEY_PREFIX = "user:role:";

    @RabbitListener(queuesToDeclare = @org.springframework.amqp.rabbit.annotation.Queue(name = "permission.queue", durable = "true"))
    public void handlePermissionSync(String message) {
        log.info("收到权限同步消息: {}", message);

        try {
            // 解析 userId（生产者发的是 userId 的 JSON）
            Long userId = Long.parseLong(message.trim());

            // TODO: RPC 调用 auth 服务获取用户权限信息

            // 临时模拟：存一个默认值
            redisTemplate.opsForValue().set(PERMISSION_KEY_PREFIX + userId, "[\"novel:read\", \"novel:write\"]");
            redisTemplate.opsForValue().set(ROLE_KEY_PREFIX + userId, "user");

            log.info("权限已存入Redis: userId={}", userId);
        } catch (Exception e) {
            log.error("处理权限同步消息失败: message={}", message, e);
        }
    }
}