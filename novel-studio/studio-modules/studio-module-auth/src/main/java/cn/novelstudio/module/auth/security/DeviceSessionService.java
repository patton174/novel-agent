package cn.novelstudio.module.auth.security;

import com.fasterxml.jackson.core.JsonProcessingException;
import cn.novelstudio.module.auth.support.AuthExceptions;
import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.platform.security.DeviceSessionRecord;
import cn.novelstudio.platform.security.SecurityRedisKeys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
public class DeviceSessionService {

    private static final String DEVICE_PREFIX = SecurityRedisKeys.DEVICE_PREFIX;

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final long sessionTtlSeconds;

    public DeviceSessionService(
        StringRedisTemplate redisTemplate,
        ObjectMapper objectMapper,
        @Value("${auth.jwt.refresh-ttl-seconds:2592000}") long sessionTtlSeconds
    ) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.sessionTtlSeconds = sessionTtlSeconds;
    }

    public void bindSession(
        Long userId,
        String sessionId,
        String fingerprint,
        Map<String, Object> envSnapshot
    ) {
        if (sessionId == null || sessionId.isBlank()) {
            return;
        }
        long now = Instant.now().toEpochMilli();
        int riskScore = computeRiskScore(envSnapshot);
        DeviceSessionRecord record = new DeviceSessionRecord(
            userId,
            sessionId,
            blankToNull(fingerprint),
            envSnapshot,
            riskScore,
            now,
            now
        );
        save(record);
    }

    public void touchHeartbeat(
        String sessionId,
        Long userId,
        String fingerprint,
        Map<String, Object> envDelta
    ) {
        DeviceSessionRecord existing = load(sessionId);
        long now = Instant.now().toEpochMilli();
        if (existing == null) {
            bindSession(userId, sessionId, fingerprint, envDelta);
            return;
        }
        if (userId != null && existing.userId() != null && !userId.equals(existing.userId())) {
            log.warn("heartbeat user mismatch sid={} expected={} got={}", sessionId, existing.userId(), userId);
            return;
        }
        Map<String, Object> env = existing.envSnapshot();
        if (envDelta != null && !envDelta.isEmpty()) {
            env = env == null ? envDelta : mergeEnv(env, envDelta);
        }
        String fp = fingerprint != null && !fingerprint.isBlank() ? fingerprint : existing.fpHash();
        DeviceSessionRecord updated = new DeviceSessionRecord(
            existing.userId(),
            sessionId,
            fp,
            env,
            existing.riskScore(),
            now,
            now
        );
        save(updated);
    }

    public void revokeSession(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return;
        }
        redisTemplate.delete(DEVICE_PREFIX + sessionId);
    }

    public void revokeSessionsForUser(Long userId) {
        if (userId == null) {
            return;
        }
        Set<String> keys = redisTemplate.keys(DEVICE_PREFIX + "*");
        if (keys == null || keys.isEmpty()) {
            return;
        }
        for (String key : keys) {
            String sessionId = key.substring(DEVICE_PREFIX.length());
            DeviceSessionRecord record = load(sessionId);
            if (record != null && userId.equals(record.userId())) {
                revokeSession(sessionId);
            }
        }
    }

    public DeviceSessionRecord load(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return null;
        }
        String json = redisTemplate.opsForValue().get(DEVICE_PREFIX + sessionId);
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, DeviceSessionRecord.class);
        } catch (JsonProcessingException ex) {
            log.warn("invalid device session sid={}: {}", sessionId, ex.getMessage());
            return null;
        }
    }

    private void save(DeviceSessionRecord record) {
        try {
            redisTemplate.opsForValue().set(
                DEVICE_PREFIX + record.sessionId(),
                objectMapper.writeValueAsString(record),
                Duration.ofSeconds(sessionTtlSeconds)
            );
        } catch (JsonProcessingException ex) {
            throw AuthExceptions.internalError("设备会话存储失败");
        }
    }

    private static int computeRiskScore(Map<String, Object> envSnapshot) {
        if (envSnapshot == null) {
            return 0;
        }
        Object webdriver = envSnapshot.get("webdriver");
        if (Boolean.TRUE.equals(webdriver)) {
            return 30;
        }
        return 0;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> mergeEnv(Map<String, Object> base, Map<String, Object> delta) {
        java.util.HashMap<String, Object> merged = new java.util.HashMap<>(base);
        merged.putAll(delta);
        return merged;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
