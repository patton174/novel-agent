package cn.novelstudio.module.agent.orchestration;

import org.springframework.data.domain.Range;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Host-mode run event log backed by Redis Stream (multi-instance replay).
 */
@Component
public class AgentRunEventJournal {

    static final String STREAM_PREFIX = "agent:run:events:";
    static final String ACTIVE_PREFIX = "agent:run:active:";
    static final String META_PREFIX = "agent:run:meta:";

    private static final int MAX_EVENTS_PER_RUN = 8_000;
    private static final Duration TTL = Duration.ofHours(24);
    private static final String PAYLOAD_FIELD = "payload";

    private final StringRedisTemplate redisTemplate;

    public AgentRunEventJournal(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void beginRun(String runId, Long userId, String sessionId) {
        if (runId == null || runId.isBlank() || sessionId == null || sessionId.isBlank()) {
            return;
        }
        String streamKey = streamKey(runId);
        redisTemplate.delete(streamKey);

        String metaKey = metaKey(runId);
        redisTemplate.opsForHash().put(metaKey, "userId", userId == null ? "" : String.valueOf(userId));
        redisTemplate.opsForHash().put(metaKey, "sessionId", sessionId);
        redisTemplate.expire(metaKey, TTL);

        if (userId != null) {
            redisTemplate.opsForValue().set(activeKey(userId, sessionId), runId, TTL);
        }
    }

    public void append(String runId, String payloadJson) {
        if (runId == null || runId.isBlank() || payloadJson == null || payloadJson.isBlank()) {
            return;
        }
        String streamKey = streamKey(runId);
        MapRecord<String, String, String> record = StreamRecords.string(
            Map.of(PAYLOAD_FIELD, payloadJson)
        ).withStreamKey(streamKey);
        redisTemplate.opsForStream().add(record);
        redisTemplate.expire(streamKey, TTL);
        redisTemplate.opsForStream().trim(streamKey, MAX_EVENTS_PER_RUN, true);
    }

    public List<String> replay(String runId) {
        if (runId == null || runId.isBlank()) {
            return List.of();
        }
        String streamKey = streamKey(runId);
        List<MapRecord<String, Object, Object>> records = redisTemplate.opsForStream().range(
            streamKey,
            Range.unbounded()
        );
        if (records == null || records.isEmpty()) {
            return List.of();
        }
        List<String> out = new ArrayList<>(records.size());
        for (MapRecord<String, Object, Object> record : records) {
            Object payload = record.getValue().get(PAYLOAD_FIELD);
            if (payload != null) {
                out.add(String.valueOf(payload));
            }
        }
        return List.copyOf(out);
    }

    public String activeRunId(Long userId, String sessionId) {
        if (userId == null || sessionId == null || sessionId.isBlank()) {
            return null;
        }
        return redisTemplate.opsForValue().get(activeKey(userId, sessionId));
    }

    public void completeRun(String runId) {
        if (runId == null || runId.isBlank()) {
            return;
        }
        String metaKey = metaKey(runId);
        Object userIdRaw = redisTemplate.opsForHash().get(metaKey, "userId");
        Object sessionIdRaw = redisTemplate.opsForHash().get(metaKey, "sessionId");
        if (userIdRaw != null && sessionIdRaw != null) {
            String sessionId = String.valueOf(sessionIdRaw);
            if (!sessionId.isBlank()) {
                try {
                    Long userId = Long.parseLong(String.valueOf(userIdRaw));
                    redisTemplate.delete(activeKey(userId, sessionId));
                } catch (NumberFormatException ignored) {
                    // ignore malformed meta
                }
            }
        }
        redisTemplate.delete(streamKey(runId));
        redisTemplate.delete(metaKey);
    }

    static String streamKey(String runId) {
        return STREAM_PREFIX + runId;
    }

    static String activeKey(Long userId, String sessionId) {
        return ACTIVE_PREFIX + userId + "::" + sessionId;
    }

    static String metaKey(String runId) {
        return META_PREFIX + runId;
    }
}
