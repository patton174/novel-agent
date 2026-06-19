package com.novel.agent.gateway.support;

import com.novel.agent.common.security.SecurityRedisKeys;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class NonceStoreSupport {

    private final StringRedisTemplate redisTemplate;

    public NonceStoreSupport(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public boolean tryConsume(String nonce, long ttlSeconds) {
        if (nonce == null || nonce.isBlank()) {
            return false;
        }
        String key = SecurityRedisKeys.NONCE_PREFIX + nonce;
        Boolean ok = redisTemplate.opsForValue().setIfAbsent(key, "1", Duration.ofSeconds(ttlSeconds));
        return Boolean.TRUE.equals(ok);
    }
}
