package cn.novelstudio.module.auth.service;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.TooManyRequestsException;
import cn.novelstudio.platform.security.SecurityRedisKeys;
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
            throw TooManyRequestsException.keyed(ResultCode.TOO_MANY_REQUESTS, "result.too_many_requests");
        }
    }

    /** 只读检查，不增加计数（用于发信等「成功后才计次」的场景）。 */
    public void assertUnderLimit(String action, String identifier, int maxAttempts, Duration window) {
        if (identifier == null || identifier.isBlank()) {
            return;
        }
        String key = SecurityRedisKeys.RATE_LIMIT_PREFIX + action + ":" + identifier;
        String raw = redisTemplate.opsForValue().get(key);
        long count = raw == null ? 0L : Long.parseLong(raw);
        if (count >= maxAttempts) {
            throw TooManyRequestsException.keyed(ResultCode.TOO_MANY_REQUESTS, "result.too_many_requests");
        }
    }

    /** 业务成功后记一次（配合 {@link #assertUnderLimit}）。 */
    public void recordSuccess(String action, String identifier, Duration window) {
        if (identifier == null || identifier.isBlank()) {
            return;
        }
        String key = SecurityRedisKeys.RATE_LIMIT_PREFIX + action + ":" + identifier;
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redisTemplate.expire(key, window);
        }
    }

    public void checkComposite(String action, String ip, String fingerprint, int maxAttempts, Duration window) {
        check(action + ":ip", ip, maxAttempts, window);
        if (fingerprint != null && !fingerprint.isBlank()) {
            check(action + ":fp", fingerprint, maxAttempts, window);
        }
    }
}
