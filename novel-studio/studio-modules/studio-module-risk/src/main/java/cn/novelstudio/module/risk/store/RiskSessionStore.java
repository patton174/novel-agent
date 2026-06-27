package cn.novelstudio.module.risk.store;

import cn.novelstudio.module.risk.config.RiskProperties;
import cn.novelstudio.module.risk.model.RiskSessionState;
import cn.novelstudio.platform.security.SecurityRedisKeys;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Slf4j
@Component
public class RiskSessionStore {

    private static final String PREFIX = SecurityRedisKeys.RISK_SESSION_PREFIX;

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final RiskProperties properties;

    public RiskSessionStore(
        StringRedisTemplate redisTemplate,
        ObjectMapper objectMapper,
        RiskProperties properties
    ) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    public RiskSessionState loadOrEmpty(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return RiskSessionState.empty();
        }
        String json = redisTemplate.opsForValue().get(PREFIX + sessionId);
        if (json == null || json.isBlank()) {
            return RiskSessionState.empty();
        }
        try {
            return objectMapper.readValue(json, RiskSessionState.class);
        } catch (JsonProcessingException ex) {
            log.warn("invalid risk state sid={}: {}", sessionId, ex.getMessage());
            return RiskSessionState.empty();
        }
    }

    public void save(String sessionId, RiskSessionState state) {
        if (sessionId == null || sessionId.isBlank() || state == null) {
            return;
        }
        try {
            redisTemplate.opsForValue().set(
                PREFIX + sessionId,
                objectMapper.writeValueAsString(state),
                Duration.ofSeconds(Math.max(60L, properties.stateTtlSeconds()))
            );
        } catch (JsonProcessingException ex) {
            log.warn("risk state save failed sid={}: {}", sessionId, ex.getMessage());
        }
    }

    public void delete(String sessionId) {
        if (sessionId != null && !sessionId.isBlank()) {
            redisTemplate.delete(PREFIX + sessionId);
        }
    }

    public Optional<Long> challengeTtlSeconds(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return Optional.empty();
        }
        Long ttl = redisTemplate.getExpire(SecurityRedisKeys.CHALLENGE_PREFIX + sessionId);
        return ttl == null || ttl < 0 ? Optional.empty() : Optional.of(ttl);
    }
}
