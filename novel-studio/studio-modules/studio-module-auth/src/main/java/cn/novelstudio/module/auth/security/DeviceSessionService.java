package cn.novelstudio.module.auth.security;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.module.auth.support.AuthExceptions;
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
    private final long defaultSessionTtlSeconds;

    public DeviceSessionService(
        StringRedisTemplate redisTemplate,
        ObjectMapper objectMapper,
        @Value("${auth.jwt.refresh-absolute-ttl-seconds:2592000}") long defaultSessionTtlSeconds
    ) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.defaultSessionTtlSeconds = defaultSessionTtlSeconds;
    }

    public void bindSession(
        Long userId,
        String sessionId,
        String fingerprint,
        Map<String, Object> envSnapshot
    ) {
        bindSession(userId, sessionId, fingerprint, envSnapshot, defaultSessionTtlSeconds);
    }

    public void bindSession(
        Long userId,
        String sessionId,
        String fingerprint,
        Map<String, Object> envSnapshot,
        long ttlSeconds
    ) {
        if (sessionId == null || sessionId.isBlank()) {
            return;
        }
        long now = Instant.now().toEpochMilli();
        DeviceSessionRecord record = new DeviceSessionRecord(
            userId,
            sessionId,
            blankToNull(fingerprint),
            envSnapshot,
            0,
            now,
            now
        );
        save(record, ttlSeconds);
    }

    public void touchHeartbeat(
        String sessionId,
        Long userId,
        String fingerprint,
        Map<String, Object> envDelta
    ) {
        touchHeartbeat(sessionId, userId, fingerprint, envDelta, defaultSessionTtlSeconds);
    }

    public void touchHeartbeat(
        String sessionId,
        Long userId,
        String fingerprint,
        Map<String, Object> envDelta,
        long ttlSeconds
    ) {
        DeviceSessionRecord existing = load(sessionId);
        long now = Instant.now().toEpochMilli();
        if (existing == null) {
            bindSession(userId, sessionId, fingerprint, envDelta, ttlSeconds);
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
        save(updated, ttlSeconds);
    }

    public void updateRiskScore(String sessionId, int riskScore) {
        DeviceSessionRecord existing = load(sessionId);
        if (existing == null) {
            return;
        }
        int clamped = Math.max(0, Math.min(100, riskScore));
        DeviceSessionRecord updated = new DeviceSessionRecord(
            existing.userId(),
            sessionId,
            existing.fpHash(),
            existing.envSnapshot(),
            clamped,
            existing.lastHeartbeatAt(),
            Instant.now().toEpochMilli()
        );
        save(updated, defaultSessionTtlSeconds);
    }

    public void extendSessionTtl(String sessionId, long ttlSeconds) {
        DeviceSessionRecord existing = load(sessionId);
        if (existing == null) {
            return;
        }
        save(existing, ttlSeconds);
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

    private void save(DeviceSessionRecord record, long ttlSeconds) {
        try {
            redisTemplate.opsForValue().set(
                DEVICE_PREFIX + record.sessionId(),
                objectMapper.writeValueAsString(record),
                Duration.ofSeconds(Math.max(1L, ttlSeconds))
            );
        } catch (JsonProcessingException ex) {
            throw AuthExceptions.internalError("auth.device.session_store_failed");
        }
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
