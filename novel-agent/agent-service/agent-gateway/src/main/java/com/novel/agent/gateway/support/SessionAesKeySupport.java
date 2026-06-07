package com.novel.agent.gateway.support;

import com.novel.agent.common.security.SecurityRedisKeys;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class SessionAesKeySupport {

    private final StringRedisTemplate redisTemplate;

    public SessionAesKeySupport(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public Optional<String> loadKeyBase64(String keyId) {
        if (keyId == null || keyId.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(redisTemplate.opsForValue().get(SecurityRedisKeys.AES_KEY_PREFIX + keyId));
    }
}
