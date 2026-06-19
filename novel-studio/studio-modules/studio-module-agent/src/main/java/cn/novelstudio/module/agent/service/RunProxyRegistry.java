package cn.novelstudio.module.agent.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registers which Java instance owns a live run; resume must stick to owner while alive.
 */
@Component
public class RunProxyRegistry {

    static final String KEY_PREFIX = "agent:run:proxy:";
    static final Duration PROXY_TTL = Duration.ofSeconds(45);
    static final long PROXY_TTL_MS = PROXY_TTL.toMillis();

    private static final String FIELD_INSTANCE = "instanceId";
    private static final String FIELD_INTERNAL = "internalBaseUrl";
    private static final String FIELD_HEARTBEAT = "heartbeatAt";

    private final StringRedisTemplate redisTemplate;
    private final RunProxyIdentity identity;
    private final Set<String> localRuns = ConcurrentHashMap.newKeySet();

    public RunProxyRegistry(StringRedisTemplate redisTemplate, RunProxyIdentity identity) {
        this.redisTemplate = redisTemplate;
        this.identity = identity;
    }

    public void claim(String runId) {
        if (runId == null || runId.isBlank()) {
            return;
        }
        long now = System.currentTimeMillis();
        String key = key(runId);
        redisTemplate.opsForHash().put(key, FIELD_INSTANCE, identity.instanceId());
        redisTemplate.opsForHash().put(key, FIELD_INTERNAL, identity.internalBaseUrl());
        redisTemplate.opsForHash().put(key, FIELD_HEARTBEAT, String.valueOf(now));
        redisTemplate.expire(key, PROXY_TTL);
        localRuns.add(runId);
    }

    public void renew(String runId) {
        if (runId == null || runId.isBlank() || !localRuns.contains(runId)) {
            return;
        }
        String key = key(runId);
        Map<Object, Object> existing = redisTemplate.opsForHash().entries(key);
        if (existing.isEmpty()) {
            claim(runId);
            return;
        }
        Object owner = existing.get(FIELD_INSTANCE);
        if (owner != null && !identity.instanceId().equals(String.valueOf(owner))) {
            return;
        }
        long now = System.currentTimeMillis();
        redisTemplate.opsForHash().put(key, FIELD_HEARTBEAT, String.valueOf(now));
        redisTemplate.expire(key, PROXY_TTL);
    }

    public void release(String runId) {
        if (runId == null || runId.isBlank()) {
            return;
        }
        localRuns.remove(runId);
        redisTemplate.delete(key(runId));
    }

    public boolean isLocalOwner(String runId) {
        return findOwner(runId)
            .map(owner -> identity.isLocal(owner.instanceId()))
            .orElse(false);
    }

    public Optional<RunProxyOwner> findOwner(String runId) {
        if (runId == null || runId.isBlank()) {
            return Optional.empty();
        }
        Map<Object, Object> raw = redisTemplate.opsForHash().entries(key(runId));
        if (raw.isEmpty()) {
            return Optional.empty();
        }
        String instanceId = stringField(raw.get(FIELD_INSTANCE));
        String internalUrl = stringField(raw.get(FIELD_INTERNAL));
        long heartbeat = parseLong(stringField(raw.get(FIELD_HEARTBEAT)));
        if (instanceId.isBlank() || internalUrl.isBlank()) {
            return Optional.empty();
        }
        return Optional.of(new RunProxyOwner(runId, instanceId, internalUrl, heartbeat));
    }

    public boolean isOwnerAlive(String runId) {
        return findOwner(runId)
            .map(owner -> owner.isAlive(PROXY_TTL_MS, System.currentTimeMillis()))
            .orElse(false);
    }

    public Set<String> localRunIds() {
        return Set.copyOf(localRuns);
    }

    private static String key(String runId) {
        return KEY_PREFIX + runId;
    }

    private static String stringField(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private static long parseLong(String value) {
        if (value == null || value.isBlank()) {
            return 0L;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ex) {
            return 0L;
        }
    }
}
