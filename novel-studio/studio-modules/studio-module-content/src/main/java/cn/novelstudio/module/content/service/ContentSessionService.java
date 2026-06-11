package cn.novelstudio.module.content.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.module.content.dto.ContentMessageDTO;
import cn.novelstudio.module.content.dto.SessionDTO;
import cn.novelstudio.module.content.config.AgentRuntimeProperties;
import cn.novelstudio.module.content.service.agent.AgentSessionPgService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import cn.novelstudio.kernel.tools.IdWorker;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ContentSessionService {
    private static final String SESSION_SET_KEY_PREFIX = "content:session:list:";
    private static final String SESSION_NOVEL_INDEX_PREFIX = "content:session:novel:";
    private static final String SESSION_META_KEY_PREFIX = "content:session:meta:";
    private static final String MESSAGE_LIST_KEY_PREFIX = "content:message:list:";
    private static final String MESSAGE_DEDUP_KEY_PREFIX = "content:message:dedup:";
    private static final String RUN_TRACE_KEY_PREFIX = "content:run:trace:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final AgentSessionPgService agentSessionPgService;
    private final AgentRuntimeProperties runtimeProperties;

    public void upsertSession(String userId, String sessionId, String title) {
        upsertSession(userId, sessionId, title, null);
    }

    public void upsertSession(String userId, String sessionId, String title, String novelId) {
        String metaKey = SESSION_META_KEY_PREFIX + userId + ":" + sessionId;
        long now = Instant.now().toEpochMilli();
        redisTemplate.opsForHash().put(metaKey, "title", title);
        redisTemplate.opsForHash().put(metaKey, "updatedAt", Long.toString(now));
        if (novelId != null && !novelId.isBlank()) {
            redisTemplate.opsForHash().put(metaKey, "novelId", novelId);
            redisTemplate.opsForZSet().add(SESSION_NOVEL_INDEX_PREFIX + userId + ":" + novelId, sessionId, now);
        }
        redisTemplate.opsForZSet().add(SESSION_SET_KEY_PREFIX + userId, sessionId, now);
        mirrorSessionToPg(userId, sessionId, title, novelId);
    }

    private void mirrorSessionToPg(String userId, String sessionId, String title, String novelId) {
        if (!runtimeProperties.isPgSessionDualWrite()) {
            return;
        }
        try {
            agentSessionPgService.upsertSession(Long.parseLong(userId), sessionId, title, novelId);
        } catch (NumberFormatException ignored) {
            // skip invalid user id
        }
    }

    public List<SessionDTO> listSessionsByNovel(String userId, String novelId, int limit) {
        var ids = redisTemplate.opsForZSet().reverseRange(
            SESSION_NOVEL_INDEX_PREFIX + userId + ":" + novelId,
            0,
            Math.max(limit - 1, 0)
        );
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        List<SessionDTO> sessions = new ArrayList<>();
        for (String sessionId : ids) {
            sessions.add(readSessionMeta(userId, sessionId));
        }
        return sessions.stream()
            .sorted(Comparator.comparingLong(SessionDTO::updatedAt).reversed())
            .collect(Collectors.toList());
    }

    public List<SessionDTO> listSessions(String userId, int limit) {
        var ids = redisTemplate.opsForZSet().reverseRange(SESSION_SET_KEY_PREFIX + userId, 0, Math.max(limit - 1, 0));
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        List<SessionDTO> sessions = new ArrayList<>();
        for (String sessionId : ids) {
            sessions.add(readSessionMeta(userId, sessionId));
        }
        return sessions.stream().sorted(Comparator.comparingLong(SessionDTO::updatedAt).reversed()).collect(Collectors.toList());
    }

    public SessionDTO getSession(String userId, String sessionId) {
        if (runtimeProperties.isReadPgSessionFirst()) {
            SessionDTO pg = readSessionFromPg(userId, sessionId);
            if (pg != null) {
                return pg;
            }
        }
        if (!isSessionOwnedByUser(userId, sessionId)) {
            return null;
        }
        return readSessionMeta(userId, sessionId);
    }

    private SessionDTO readSessionMeta(String userId, String sessionId) {
        String metaKey = SESSION_META_KEY_PREFIX + userId + ":" + sessionId;
        Map<Object, Object> meta = redisTemplate.opsForHash().entries(metaKey);
        String title = String.valueOf(meta.getOrDefault("title", "新对话"));
        long updatedAt = parseLong(meta.get("updatedAt"), Instant.now().toEpochMilli());
        Object novelIdRaw = meta.get("novelId");
        String novelId = novelIdRaw == null ? null : String.valueOf(novelIdRaw);
        return new SessionDTO(sessionId, title, updatedAt, novelId);
    }

    public String resolveNovelId(String userId, String sessionId) {
        return readNovelId(userId, sessionId);
    }

    private String readNovelId(String userId, String sessionId) {
        String metaKey = SESSION_META_KEY_PREFIX + userId + ":" + sessionId;
        Object novelIdRaw = redisTemplate.opsForHash().get(metaKey, "novelId");
        return novelIdRaw == null ? null : String.valueOf(novelIdRaw);
    }

    public boolean isSessionOwnedByUser(String userId, String sessionId) {
        if (runtimeProperties.isReadPgSessionFirst()) {
            Boolean pgOwned = isSessionOwnedByUserPg(userId, sessionId);
            if (pgOwned != null) {
                return pgOwned;
            }
        }
        return redisTemplate.opsForZSet().score(SESSION_SET_KEY_PREFIX + userId, sessionId) != null;
    }

    private SessionDTO readSessionFromPg(String userId, String sessionId) {
        try {
            return agentSessionPgService.getSession(Long.parseLong(userId), sessionId);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Boolean isSessionOwnedByUserPg(String userId, String sessionId) {
        try {
            return agentSessionPgService.isSessionOwnedByUser(Long.parseLong(userId), sessionId);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    public boolean deleteSession(String userId, String sessionId) {
        if (userId == null || userId.isBlank() || sessionId == null || sessionId.isBlank()) {
            return false;
        }
        if (!isSessionOwnedByUser(userId, sessionId)) {
            return false;
        }
        purgeSessionData(userId, sessionId);
        return true;
    }

    public int deleteSessions(String userId, List<String> sessionIds) {
        if (userId == null || userId.isBlank() || sessionIds == null || sessionIds.isEmpty()) {
            return 0;
        }
        int deleted = 0;
        for (String sessionId : sessionIds) {
            if (sessionId == null || sessionId.isBlank()) {
                continue;
            }
            if (deleteSession(userId, sessionId)) {
                deleted++;
            }
        }
        return deleted;
    }

    private void purgeSessionData(String userId, String sessionId) {
        String novelId = readNovelId(userId, sessionId);
        redisTemplate.opsForZSet().remove(SESSION_SET_KEY_PREFIX + userId, sessionId);
        if (novelId != null && !novelId.isBlank()) {
            redisTemplate.opsForZSet().remove(SESSION_NOVEL_INDEX_PREFIX + userId + ":" + novelId, sessionId);
        }
        redisTemplate.delete(SESSION_META_KEY_PREFIX + userId + ":" + sessionId);
        redisTemplate.delete(MESSAGE_LIST_KEY_PREFIX + userId + ":" + sessionId);
        redisTemplate.delete(MESSAGE_DEDUP_KEY_PREFIX + userId + ":" + sessionId);
        String tracePattern = RUN_TRACE_KEY_PREFIX + userId + ":" + sessionId + ":*";
        Set<String> traceKeys = redisTemplate.keys(tracePattern);
        if (traceKeys != null && !traceKeys.isEmpty()) {
            redisTemplate.delete(traceKeys);
        }
    }

    public void appendMessage(String userId, String sessionId, String role, String content, String runId, String messageId, String mode) {
        if (runId != null && !runId.isBlank() && messageId != null && !messageId.isBlank()) {
            String dedupKey = MESSAGE_DEDUP_KEY_PREFIX + userId + ":" + sessionId;
            String dedupValue = runId + ":" + messageId;
            Boolean firstSeen = redisTemplate.opsForSet().add(dedupKey, dedupValue) == 1;
            if (!Boolean.TRUE.equals(firstSeen)) {
                return;
            }
        }
        upsertSession(userId, sessionId, inferTitle(content), readNovelId(userId, sessionId));
        ContentMessageDTO dto = new ContentMessageDTO(
            IdWorker.nextIdStr(),
            sessionId,
            role,
            content,
            runId,
            messageId,
            mode,
            Instant.now().toEpochMilli()
        );
        try {
            redisTemplate.opsForList().rightPush(MESSAGE_LIST_KEY_PREFIX + userId + ":" + sessionId, objectMapper.writeValueAsString(dto));
        } catch (JsonProcessingException ignored) {
        }
        mirrorMessageToPg(userId, sessionId, role, content, runId, messageId, dto.id());
    }

    private void mirrorMessageToPg(
        String userId,
        String sessionId,
        String role,
        String content,
        String runId,
        String messageId,
        String fallbackMessageId
    ) {
        if (!runtimeProperties.isPgSessionDualWrite()) {
            return;
        }
        try {
            String pgMessageId = messageId != null && !messageId.isBlank() ? messageId : fallbackMessageId;
            agentSessionPgService.appendMessage(
                Long.parseLong(userId),
                sessionId,
                pgMessageId,
                role,
                content,
                "completed",
                runId
            );
        } catch (NumberFormatException ignored) {
            // skip
        }
    }

    public void saveRunTrace(String userId, String sessionId, String runId, String traceJson) {
        if (userId == null || userId.isBlank() || sessionId == null || sessionId.isBlank()) {
            return;
        }
        if (runId == null || runId.isBlank() || traceJson == null || traceJson.isBlank()) {
            return;
        }
        String key = RUN_TRACE_KEY_PREFIX + userId + ":" + sessionId + ":" + runId;
        redisTemplate.opsForValue().set(key, traceJson);
    }

    public String readRunTrace(String userId, String sessionId, String runId) {
        if (runId == null || runId.isBlank()) {
            return null;
        }
        String key = RUN_TRACE_KEY_PREFIX + userId + ":" + sessionId + ":" + runId;
        return redisTemplate.opsForValue().get(key);
    }

    public List<ContentMessageDTO> listMessages(String userId, String sessionId, int limit) {
        int safeLimit = Math.max(limit, 1);
        String key = MESSAGE_LIST_KEY_PREFIX + userId + ":" + sessionId;
        Long size = redisTemplate.opsForList().size(key);
        if (size == null || size == 0) {
            return List.of();
        }
        long start = Math.max(0, size - safeLimit);
        var raw = redisTemplate.opsForList().range(key, start, size);
        if (raw == null) {
            return List.of();
        }
        return raw.stream()
            .map(this::readMessage)
            .filter(m -> m != null)
            .map(m -> enrichMessageTrace(userId, sessionId, m))
            .toList();
    }

    private ContentMessageDTO enrichMessageTrace(String userId, String sessionId, ContentMessageDTO message) {
        if (message == null || message.agentTraceJson() != null) {
            return message;
        }
        if (!"assistant".equalsIgnoreCase(message.role())) {
            return message;
        }
        String runId = message.runId();
        if (runId == null || runId.isBlank()) {
            return message;
        }
        String traceJson = readRunTrace(userId, sessionId, runId);
        if (traceJson == null || traceJson.isBlank()) {
            return message;
        }
        return new ContentMessageDTO(
            message.id(),
            message.sessionId(),
            message.role(),
            message.content(),
            message.runId(),
            message.messageId(),
            message.mode(),
            message.createdAt(),
            traceJson
        );
    }

    private ContentMessageDTO readMessage(String json) {
        try {
            return objectMapper.readValue(json, ContentMessageDTO.class);
        } catch (Exception e) {
            return null;
        }
    }

    private long parseLong(Object value, long fallback) {
        if (value == null) return fallback;
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (Exception e) {
            return fallback;
        }
    }

    private String inferTitle(String content) {
        if (content == null || content.isBlank()) {
            return "新对话";
        }
        String clean = content.replaceAll("\\s+", " ").trim();
        return clean.length() > 18 ? clean.substring(0, 18) + "..." : clean;
    }
}
