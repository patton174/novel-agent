package cn.novelstudio.module.billing.service;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.TooManyRequestsException;
import cn.novelstudio.platform.security.SecurityRedisKeys;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class BillingRateLimitService {

    private final StringRedisTemplate redisTemplate;

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

    public void checkComposite(String action, String ip, String identifier, int maxAttempts, Duration window) {
        check(action + ":ip", ip, maxAttempts, window);
        if (identifier != null && !identifier.isBlank()) {
            check(action + ":user", identifier, maxAttempts, window);
        }
    }
}
