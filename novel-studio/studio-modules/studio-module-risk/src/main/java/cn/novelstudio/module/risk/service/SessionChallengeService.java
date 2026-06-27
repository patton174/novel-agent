package cn.novelstudio.module.risk.service;

import cn.novelstudio.module.risk.config.RiskProperties;
import cn.novelstudio.platform.security.SecurityRedisKeys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class SessionChallengeService {

    private static final String PREFIX = SecurityRedisKeys.CHALLENGE_PREFIX;

    private final StringRedisTemplate redisTemplate;
    private final RiskProperties properties;

    public void markChallengeRequired(String sessionId, Long userId) {
        if (sessionId == null || sessionId.isBlank()) {
            return;
        }
        String payload = userId == null ? "1" : String.valueOf(userId);
        redisTemplate.opsForValue().set(
            PREFIX + sessionId,
            payload,
            Duration.ofSeconds(Math.max(60L, properties.challengeTtlSeconds()))
        );
    }

    public boolean isChallengePending(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return false;
        }
        String value = redisTemplate.opsForValue().get(PREFIX + sessionId);
        return value != null && !value.isBlank();
    }

    public void clearChallenge(String sessionId) {
        if (sessionId != null && !sessionId.isBlank()) {
            redisTemplate.delete(PREFIX + sessionId);
        }
    }
}
