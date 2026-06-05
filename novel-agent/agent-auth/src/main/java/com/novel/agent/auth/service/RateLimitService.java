package com.novel.agent.auth.service;

import com.novel.agent.common.core.exception.TooManyRequestsException;
import com.novel.agent.common.security.SecurityRedisKeys;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class RateLimitService {

    private final StringRedisTemplate redisTemplate;

    public RateLimitService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void check(String action, String identifier, int maxAttempts, Duration window) {
        if (identifier == null || identifier.isBlank()) {
            return;
        }
        String key = SecurityRedisKeys.RATE_LIMIT_PREFIX + action + ":" + identifier;
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redisTemplate.expire(key, window);
        }
        if (count != null && count > maxAttempts) {
            throw new TooManyRequestsException("请求过于频繁，请稍后再试");
        }
    }

    public void checkComposite(String action, String ip, String fingerprint, int maxAttempts, Duration window) {
        check(action + ":ip", ip, maxAttempts, window);
        if (fingerprint != null && !fingerprint.isBlank()) {
            check(action + ":fp", fingerprint, maxAttempts, window);
        }
    }
}
