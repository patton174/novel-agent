package cn.novelstudio.module.billing.support;

import cn.novelstudio.kernel.exception.TooManyRequestsException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class BillingRpmChecker {

    private final StringRedisTemplate redis;

    /** 每分钟请求限流。超 maxRpm 抛 TooManyRequestsException。 */
    public void check(Long userId, int maxRpm, Duration window) {
        if (userId == null || maxRpm <= 0) {
            return;
        }
        String key = "billing:rpm:" + userId;
        Long count = redis.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redis.expire(key, window);
        }
        if (count != null && count > maxRpm) {
            throw new TooManyRequestsException(
                "请求过于频繁，请稍后再试（" + maxRpm + " 次/分钟）"
            );
        }
    }
}
