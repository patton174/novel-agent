package com.novel.agent.gateway.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.security.SecurityRedisKeys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;

/** 当前 Worker 注册的 bootstrap runtime（含动态 apiPathPrefix），仅服务端 Redis，不下发路由表。 */
@Slf4j
@Component
public class BootstrapRuntimeSupport {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public BootstrapRuntimeSupport(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public Optional<BootstrapRuntime> current() {
        String json = redisTemplate.opsForValue().get(SecurityRedisKeys.CRYPTO_BOOTSTRAP_KEY);
        if (json == null || json.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(objectMapper.readValue(json, BootstrapRuntime.class));
        } catch (Exception ex) {
            log.warn("bootstrap runtime parse failed: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    public record BootstrapRuntime(
        String keyId,
        String aesKeyB64,
        long version,
        long expiresAtEpochMs,
        String apiPathPrefix,
        String registeredBy
    ) {
    }
}
