package cn.novelstudio.module.content.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.platform.messaging.constant.MqTopic;
import cn.novelstudio.platform.messaging.producer.IMessageProducer;
import cn.novelstudio.module.content.dto.StoryMemoryReadSliceDTO;
import cn.novelstudio.module.content.entity.NovelStoryMemoryEntity;
import cn.novelstudio.module.content.entity.StoryMemoryEntity;
import cn.novelstudio.module.content.repository.NovelRepository;
import cn.novelstudio.module.content.repository.NovelStoryMemoryRepository;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.module.content.repository.StoryMemoryRepository;
import cn.novelstudio.module.content.support.ContentExceptions;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StoryMemoryService {

    private static final Logger log = LoggerFactory.getLogger(StoryMemoryService.class);
    private static final String SESSION_MEMORY_KEY_PREFIX = "content:story-memory:";
    private static final String NOVEL_MEMORY_KEY_PREFIX = "content:novel-memory:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final StoryMemoryRepository storyMemoryRepository;
    private final NovelStoryMemoryRepository novelStoryMemoryRepository;
    private final NovelRepository novelRepository;
    private final ContentSessionService contentSessionService;
    private final ObjectProvider<IMessageProducer> messageProducerProvider;

    public Map<String, Object> getMemory(String userId, String sessionId) {
        String novelId = contentSessionService.resolveNovelId(userId, sessionId);
        if (novelId != null && !novelId.isBlank()) {
            maybeMigrateSessionToNovel(userId, sessionId, novelId);
            return getNovelMemory(userId, novelId);
        }
        return getLegacySessionMemory(userId, sessionId);
    }

    public Map<String, Object> patchMemory(
        String userId,
        String sessionId,
        String scope,
        String key,
        String value,
        String itemId
    ) {
        String novelId = contentSessionService.resolveNovelId(userId, sessionId);
        if (novelId != null && !novelId.isBlank()) {
            maybeMigrateSessionToNovel(userId, sessionId, novelId);
            return patchNovelMemory(userId, novelId, scope, key, value, itemId);
        }
        return patchLegacySessionMemory(userId, sessionId, scope, key, value, itemId);
    }

    public Map<String, Object> deleteMemory(
        String userId,
        String sessionId,
        String scope,
        String key,
        String itemId
    ) {
        String novelId = contentSessionService.resolveNovelId(userId, sessionId);
        if (novelId != null && !novelId.isBlank()) {
            maybeMigrateSessionToNovel(userId, sessionId, novelId);
            return deleteNovelMemory(userId, novelId, scope, key, itemId);
        }
        Map<String, Object> memory = new LinkedHashMap<>(getLegacySessionMemory(userId, sessionId));
        return applyDelete(userId, null, sessionId, memory, scope, key, itemId, false);
    }

    /** 删除会话时清理该 session 维度的 Redis / PostgreSQL 故事记忆（不删已迁移到 novel 的记忆）。 */
    public void purgeSessionMemory(String userId, String sessionId) {
        if (userId == null || userId.isBlank() || sessionId == null || sessionId.isBlank()) {
            return;
        }
        try {
            redisTemplate.delete(sessionMemoryKey(userId, sessionId));
        } catch (Exception ex) {
            log.warn("删除 Redis 故事记忆失败 userId={}, sessionId={}", userId, sessionId, ex);
        }
        Long uid = parseUserId(userId);
        if (uid == null) {
            return;
        }
        storyMemoryRepository.findByUserIdAndSessionId(uid, sessionId).ifPresent(entity -> {
            storyMemoryRepository.delete(entity);
            log.debug("已删除 PostgreSQL 故事记忆 userId={}, sessionId={}", uid, sessionId);
        });
    }

    public void persistCold(String userId, String sessionId, Map<String, Object> memory) {
        String novelId = contentSessionService.resolveNovelId(userId, sessionId);
        if (novelId != null && !novelId.isBlank()) {
            persistNovelCold(userId, novelId, memory);
            return;
        }
        persistLegacySessionCold(userId, sessionId, memory);
    }

    public String renderForPrompt(String userId, String sessionId, int maxLen) {
        Map<String, Object> memory = getMemory(userId, sessionId);
        return renderMemoryText(memory, maxLen);
    }

    /**
     * Agent Read: line-based slice of one story-memory entry (1-based offset; omit limit = through EOF).
     */
    public StoryMemoryReadSliceDTO readNovelMemorySlice(
        String userId,
        String novelId,
        String scope,
        String key,
        String itemId,
        Integer offset,
        Integer limit
    ) {
        assertNovelOwned(userId, novelId);
        Map<String, Object> memory = getNovelMemory(userId, novelId);
        return buildMemoryReadSlice(memory, scope, key, itemId, offset, limit);
    }

    public StoryMemoryReadSliceDTO readSessionMemorySlice(
        String userId,
        String sessionId,
        String scope,
        String key,
        String itemId,
        Integer offset,
        Integer limit
    ) {
        Map<String, Object> memory = getMemory(userId, sessionId);
        return buildMemoryReadSlice(memory, scope, key, itemId, offset, limit);
    }

    public Map<String, Object> getNovelMemory(String userId, String novelId) {
        assertNovelOwned(userId, novelId);
        String key = novelMemoryKey(userId, novelId);
        if (Boolean.TRUE.equals(redisTemplate.hasKey(key))) {
            String raw = redisTemplate.opsForValue().get(key);
            if (raw != null && !raw.isBlank()) {
                try {
                    Map<String, Object> parsed = objectMapper.readValue(raw, new TypeReference<>() {});
                    return normalizeMemory(parsed);
                } catch (Exception ex) {
                    log.warn("解析 Redis 小说记忆失败 userId={}, novelId={}", userId, novelId, ex);
                }
            }
        }
        return loadNovelFromColdOrEmpty(userId, novelId);
    }

    public Map<String, Object> patchNovelMemory(
        String userId,
        String novelId,
        String scope,
        String key,
        String value,
        String itemId
    ) {
        assertNovelOwned(userId, novelId);
        Map<String, Object> memory = new LinkedHashMap<>(getNovelMemory(userId, novelId));
        return applyPatch(userId, novelId, null, memory, scope, key, value, itemId, true);
    }

    public Map<String, Object> deleteNovelMemory(
        String userId,
        String novelId,
        String scope,
        String key,
        String itemId
    ) {
        assertNovelOwned(userId, novelId);
        Map<String, Object> memory = new LinkedHashMap<>(getNovelMemory(userId, novelId));
        return applyDelete(userId, novelId, null, memory, scope, key, itemId, true);
    }

    public Map<String, Object> clearNovelMemoryScope(String userId, String novelId, String scope) {
        assertNovelOwned(userId, novelId);
        String scopeNorm = normalizeScope(scope);
        if (!isValidScope(scopeNorm)) {
            return Map.of("ok", false, "reason", "unsupported scope: " + scopeNorm);
        }
        Map<String, Object> memory = new LinkedHashMap<>(getNovelMemory(userId, novelId));
        switch (scopeNorm) {
            case "world" -> memory.put("world", new LinkedHashMap<>());
            case "background" -> memory.put("background", new LinkedHashMap<>());
            case "character" -> memory.put("characters", new LinkedHashMap<>());
            case "chapter" -> memory.put("chapters", new LinkedHashMap<>());
            default -> memory.put("novel", new LinkedHashMap<>());
        }
        persistNovelHotAndEnqueueCold(userId, novelId, memory);
        return Map.of("ok", true, "scope", scopeNorm, "cleared", true);
    }

    public void persistNovelCold(String userId, String novelId, Map<String, Object> memory) {
        assertNovelOwned(userId, novelId);
        Long uid = parseUserId(userId);
        if (uid == null || novelId == null || novelId.isBlank()) {
            return;
        }
        Map<String, Object> normalized = normalizeMemory(memory);
        try {
            String json = objectMapper.writeValueAsString(normalized);
            NovelStoryMemoryEntity entity = novelStoryMemoryRepository.findByUserIdAndNovelId(uid, novelId)
                .orElseGet(() -> new NovelStoryMemoryEntity(uid, novelId, json));
            entity.setMemoryJson(json);
            novelStoryMemoryRepository.save(entity);
            log.debug("小说记忆已落 PostgreSQL userId={}, novelId={}", uid, novelId);
        } catch (Exception ex) {
            log.error("小说记忆落 PostgreSQL 失败 userId={}, novelId={}", uid, novelId, ex);
            throw BizException.of(ResultCode.ERROR, "persist novel story memory failed");
        }
    }

    public void persistNovelColdScopePatch(
        String userId,
        String novelId,
        String scope,
        String itemId,
        Map<String, Object> bucket
    ) {
        assertNovelOwned(userId, novelId);
        Long uid = parseUserId(userId);
        if (uid == null || novelId == null || novelId.isBlank()) {
            return;
        }
        String scopeNorm = normalizeScope(scope);
        Map<String, Object> existing = loadNovelFromColdOrEmpty(userId, novelId);
        mergeScopePatch(existing, scopeNorm, itemId, bucket);
        persistNovelCold(userId, novelId, existing);
    }

    public String renderForPromptNovel(String userId, String novelId, int maxLen) {
        Map<String, Object> memory = getNovelMemory(userId, novelId);
        return renderMemoryText(memory, maxLen);
    }

    private Map<String, Object> getLegacySessionMemory(String userId, String sessionId) {
        String key = sessionMemoryKey(userId, sessionId);
        if (Boolean.TRUE.equals(redisTemplate.hasKey(key))) {
            String raw = redisTemplate.opsForValue().get(key);
            if (raw != null && !raw.isBlank()) {
                try {
                    Map<String, Object> parsed = objectMapper.readValue(raw, new TypeReference<>() {});
                    return normalizeMemory(parsed);
                } catch (Exception ex) {
                    log.warn("解析 Redis 故事记忆失败 userId={}, sessionId={}", userId, sessionId, ex);
                }
            }
        }
        return loadSessionFromColdOrEmpty(userId, sessionId);
    }

    private Map<String, Object> patchLegacySessionMemory(
        String userId,
        String sessionId,
        String scope,
        String key,
        String value,
        String itemId
    ) {
        Map<String, Object> memory = new LinkedHashMap<>(getLegacySessionMemory(userId, sessionId));
        return applyPatch(userId, null, sessionId, memory, scope, key, value, itemId, false);
    }

    private void persistLegacySessionCold(String userId, String sessionId, Map<String, Object> memory) {
        Long uid = parseUserId(userId);
        if (uid == null || sessionId == null || sessionId.isBlank()) {
            return;
        }
        Map<String, Object> normalized = normalizeMemory(memory);
        try {
            String json = objectMapper.writeValueAsString(normalized);
            StoryMemoryEntity entity = storyMemoryRepository.findByUserIdAndSessionId(uid, sessionId)
                .orElseGet(() -> new StoryMemoryEntity(uid, sessionId, json));
            entity.setMemoryJson(json);
            storyMemoryRepository.save(entity);
            log.debug("故事记忆已落 PostgreSQL userId={}, sessionId={}", uid, sessionId);
        } catch (Exception ex) {
            log.error("故事记忆落 PostgreSQL 失败 userId={}, sessionId={}", uid, sessionId, ex);
            throw BizException.of(ResultCode.ERROR, "persist story memory failed");
        }
    }

    private Map<String, Object> applyPatch(
        String userId,
        String novelId,
        String sessionId,
        Map<String, Object> memory,
        String scope,
        String key,
        String value,
        String itemId,
        boolean novelScoped
    ) {
        String scopeNorm = normalizeScope(scope);
        if (!isValidScope(scopeNorm)) {
            return Map.of("ok", false, "reason", "unsupported scope: " + scopeNorm);
        }
        if (key == null || key.isBlank() || value == null || value.isBlank()) {
            return Map.of("ok", false, "reason", "key/value required");
        }
        if ("character".equals(scopeNorm) || "chapter".equals(scopeNorm)) {
            String id = itemId == null || itemId.isBlank() ? "" : itemId.trim();
            String resolvedKey = key.trim();
            if ("character".equals(scopeNorm)) {
                Map<String, Map<String, String>> characters = castNestedMap(memory.get("characters"));
                String[] resolved = resolveCharacterPatch(characters, resolvedKey, id);
                if (resolved[2] != null) {
                    return Map.of("ok", false, "reason", resolved[2]);
                }
                id = resolved[0];
                resolvedKey = resolved[1];
            }
            if (id.isBlank()) {
                return Map.of("ok", false, "reason", "item_id required for character/chapter write");
            }
            itemId = id;
            key = resolvedKey;
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> bucket = (Map<String, Object>) scopeBucket(memory, scopeNorm, itemId);
        String prev = String.valueOf(bucket.getOrDefault(key.trim(), "")).trim();
        boolean changed = !prev.equals(value.trim());
        bucket.put(key.trim(), value.trim());
        if (novelScoped) {
            if (changed) {
                persistNovelHotAndEnqueueScopeCold(userId, novelId, memory, scopeNorm, itemId, bucket);
            } else {
                persistNovelHotOnly(userId, novelId, memory);
            }
        } else {
            persistSessionHotAndEnqueueCold(userId, sessionId, memory);
        }
        return Map.of(
            "ok", true,
            "scope", scopeNorm,
            "key", key.trim(),
            "changed", changed
        );
    }

    private Map<String, Object> applyDelete(
        String userId,
        String novelId,
        String sessionId,
        Map<String, Object> memory,
        String scope,
        String key,
        String itemId,
        boolean novelScoped
    ) {
        String scopeNorm = normalizeScope(scope);
        if (!isValidScope(scopeNorm)) {
            return Map.of("ok", false, "reason", "unsupported scope: " + scopeNorm);
        }
        String keyNorm = key == null ? "" : key.trim();
        boolean deleteWholeItem = "*".equals(keyNorm) || "全部".equals(keyNorm);

        if ("character".equals(scopeNorm) || "chapter".equals(scopeNorm)) {
            String id = itemId == null || itemId.isBlank() ? "" : itemId.trim();
            if ("character".equals(scopeNorm)) {
                @SuppressWarnings("unchecked")
                Map<String, Map<String, String>> characters = castNestedMap(memory.get("characters"));
                if (!id.isBlank()) {
                    String matched = fuzzyMatchCharacterName(id, characters);
                    if (matched != null) {
                        id = matched;
                    }
                } else if (deleteWholeItem || isKnownCharacterFieldKey(keyNorm)) {
                    return Map.of("ok", false, "reason", "item_id required for character/chapter delete");
                } else {
                    String matched = fuzzyMatchCharacterName(keyNorm, characters);
                    id = matched != null ? matched : keyNorm;
                }
            }
            if (id.isBlank()) {
                return Map.of("ok", false, "reason", "item_id required for character/chapter delete");
            }
            itemId = id;
            if (keyNorm.isBlank()) {
                keyNorm = "*";
                deleteWholeItem = true;
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> groups = (Map<String, Object>) memory.get(
                "character".equals(scopeNorm) ? "characters" : "chapters"
            );
            if (!groups.containsKey(id)) {
                return Map.of("ok", false, "reason", "item not found: " + id);
            }
            if (deleteWholeItem) {
                groups.remove(id);
            } else {
                @SuppressWarnings("unchecked")
                Map<String, Object> bucket = (Map<String, Object>) groups.get(id);
                if (!bucket.containsKey(keyNorm)) {
                    return Map.of("ok", false, "reason", "key not found: " + keyNorm);
                }
                bucket.remove(keyNorm);
                if (bucket.isEmpty()) {
                    groups.remove(id);
                }
            }
            if (novelScoped) {
                persistNovelHotAndEnqueueCold(userId, novelId, memory);
            } else {
                persistSessionHotAndEnqueueCold(userId, sessionId, memory);
            }
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("ok", true);
            result.put("scope", scopeNorm);
            result.put("item_id", id);
            result.put("deleted", true);
            if (!deleteWholeItem) {
                result.put("key", keyNorm);
            }
            return result;
        }

        if (keyNorm.isBlank()) {
            return Map.of("ok", false, "reason", "key required");
        }
        if (deleteWholeItem) {
            return Map.of("ok", false, "reason", "flat scope delete requires concrete key");
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> bucket = (Map<String, Object>) scopeBucket(memory, scopeNorm, itemId);
        if (!bucket.containsKey(keyNorm)) {
            return Map.of("ok", false, "reason", "key not found: " + keyNorm);
        }
        bucket.remove(keyNorm);
        if (novelScoped) {
            persistNovelHotAndEnqueueCold(userId, novelId, memory);
        } else {
            persistSessionHotAndEnqueueCold(userId, sessionId, memory);
        }
        return Map.of(
            "ok", true,
            "scope", scopeNorm,
            "key", keyNorm,
            "deleted", true
        );
    }

    private void maybeMigrateSessionToNovel(String userId, String sessionId, String novelId) {
        Map<String, Object> novelMemory = getNovelMemory(userId, novelId);
        if (!isMemoryEmpty(novelMemory)) {
            return;
        }
        Map<String, Object> sessionMemory = getLegacySessionMemory(userId, sessionId);
        if (isMemoryEmpty(sessionMemory)) {
            return;
        }
        persistNovelHotAndEnqueueCold(userId, novelId, sessionMemory);
        log.info("已将 session 故事记忆迁移至 novel userId={}, sessionId={}, novelId={}", userId, sessionId, novelId);
    }

    private Map<String, Object> loadSessionFromColdOrEmpty(String userId, String sessionId) {
        Long uid = parseUserId(userId);
        if (uid == null || sessionId == null || sessionId.isBlank()) {
            return deepCopyEmpty();
        }
        Optional<StoryMemoryEntity> entity = storyMemoryRepository.findByUserIdAndSessionId(uid, sessionId);
        if (entity.isEmpty()) {
            return deepCopyEmpty();
        }
        try {
            Map<String, Object> parsed = objectMapper.readValue(entity.get().getMemoryJson(), new TypeReference<>() {});
            Map<String, Object> memory = normalizeMemory(parsed);
            persistSessionHotOnly(userId, sessionId, memory);
            log.info("故事记忆从 PostgreSQL 回填 Redis userId={}, sessionId={}", uid, sessionId);
            return memory;
        } catch (Exception ex) {
            log.warn("解析 PostgreSQL 故事记忆失败 userId={}, sessionId={}", uid, sessionId, ex);
            return deepCopyEmpty();
        }
    }

    private Map<String, Object> loadNovelFromColdOrEmpty(String userId, String novelId) {
        Long uid = parseUserId(userId);
        if (uid == null || novelId == null || novelId.isBlank()) {
            return deepCopyEmpty();
        }
        Optional<NovelStoryMemoryEntity> entity = novelStoryMemoryRepository.findByUserIdAndNovelId(uid, novelId);
        if (entity.isEmpty()) {
            return deepCopyEmpty();
        }
        try {
            Map<String, Object> parsed = objectMapper.readValue(entity.get().getMemoryJson(), new TypeReference<>() {});
            Map<String, Object> memory = normalizeMemory(parsed);
            persistNovelHotOnly(userId, novelId, memory);
            log.info("小说记忆从 PostgreSQL 回填 Redis userId={}, novelId={}", uid, novelId);
            return memory;
        } catch (Exception ex) {
            log.warn("解析 PostgreSQL 小说记忆失败 userId={}, novelId={}", uid, novelId, ex);
            return deepCopyEmpty();
        }
    }

    private void persistSessionHotAndEnqueueCold(String userId, String sessionId, Map<String, Object> memory) {
        persistSessionHotOnly(userId, sessionId, memory);
        publishColdPersist(userId, sessionId, null, memory, null, null, null);
    }

    private void persistNovelHotAndEnqueueCold(String userId, String novelId, Map<String, Object> memory) {
        persistNovelHotOnly(userId, novelId, memory);
        publishColdPersist(userId, null, novelId, memory, null, null, null);
    }

    private void persistNovelHotAndEnqueueScopeCold(
        String userId,
        String novelId,
        Map<String, Object> memory,
        String scopeNorm,
        String itemId,
        Map<String, Object> bucket
    ) {
        persistNovelHotOnly(userId, novelId, memory);
        Map<String, Object> patchBucket = snapshotScopeBucket(bucket);
        publishColdPersist(userId, null, novelId, memory, scopeNorm, itemId, patchBucket);
    }

    private void persistSessionHotOnly(String userId, String sessionId, Map<String, Object> memory) {
        try {
            redisTemplate.opsForValue().set(
                sessionMemoryKey(userId, sessionId),
                objectMapper.writeValueAsString(normalizeMemory(memory))
            );
        } catch (Exception ex) {
            log.warn("写入 Redis 故事记忆失败 userId={}, sessionId={}", userId, sessionId, ex);
        }
    }

    private void persistNovelHotOnly(String userId, String novelId, Map<String, Object> memory) {
        try {
            redisTemplate.opsForValue().set(
                novelMemoryKey(userId, novelId),
                objectMapper.writeValueAsString(normalizeMemory(memory))
            );
        } catch (Exception ex) {
            log.warn("写入 Redis 小说记忆失败 userId={}, novelId={}", userId, novelId, ex);
        }
    }

    private void publishColdPersist(
        String userId,
        String sessionId,
        String novelId,
        Map<String, Object> memory,
        String patchScope,
        String patchItemId,
        Map<String, Object> patchBucket
    ) {
        IMessageProducer producer = messageProducerProvider.getIfAvailable();
        boolean incremental = patchScope != null && !patchScope.isBlank()
            && patchBucket != null && !patchBucket.isEmpty()
            && novelId != null && !novelId.isBlank();
        if (producer == null) {
            if (novelId != null && !novelId.isBlank()) {
                log.warn("MQ 未配置，小说记忆改为同步落 PostgreSQL userId={}, novelId={}", userId, novelId);
                if (incremental) {
                    persistNovelColdScopePatch(userId, novelId, patchScope, patchItemId, patchBucket);
                } else {
                    persistNovelCold(userId, novelId, memory);
                }
            } else {
                log.warn("MQ 未配置，故事记忆改为同步落 PostgreSQL userId={}, sessionId={}", userId, sessionId);
                persistLegacySessionCold(userId, sessionId, memory);
            }
            return;
        }
        Long uid = parseUserId(userId);
        if (uid == null) {
            return;
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("user_id", uid);
        if (novelId != null && !novelId.isBlank()) {
            payload.put("novel_id", novelId);
        } else if (sessionId != null && !sessionId.isBlank()) {
            payload.put("session_id", sessionId);
        } else {
            return;
        }
        if (incremental) {
            payload.put("patch_scope", patchScope);
            if (patchItemId != null && !patchItemId.isBlank()) {
                payload.put("patch_item_id", patchItemId);
            }
            payload.put("patch_bucket", patchBucket);
        } else {
            payload.put("memory", normalizeMemory(memory));
        }
        try {
            producer.send(MqTopic.STORY_MEMORY, payload);
            log.debug(
                "已发布故事记忆持久化事件 userId={}, novelId={}, sessionId={}, incremental={}",
                uid,
                novelId,
                sessionId,
                incremental
            );
        } catch (Exception ex) {
            log.warn(
                "发送 STORY_MEMORY 消息失败，改为同步落 PostgreSQL userId={}, novelId={}, sessionId={}, err={}",
                uid,
                novelId,
                sessionId,
                ex.getMessage()
            );
            try {
                if (novelId != null && !novelId.isBlank()) {
                    if (incremental) {
                        persistNovelColdScopePatch(userId, novelId, patchScope, patchItemId, patchBucket);
                    } else {
                        persistNovelCold(userId, novelId, memory);
                    }
                } else {
                    persistLegacySessionCold(userId, sessionId, memory);
                }
            } catch (Exception persistEx) {
                log.error(
                    "故事记忆同步落 PostgreSQL 失败 userId={}, novelId={}, sessionId={}",
                    uid,
                    novelId,
                    sessionId,
                    persistEx
                );
            }
        }
    }

    @SuppressWarnings("unchecked")
    static void mergeScopePatch(
        Map<String, Object> memory,
        String scopeNorm,
        String itemId,
        Map<String, Object> patchBucket
    ) {
        if (memory == null || patchBucket == null || patchBucket.isEmpty()) {
            return;
        }
        Map<String, Object> normalized = normalizeMemoryStatic(memory);
        memory.clear();
        memory.putAll(normalized);
        if ("character".equals(scopeNorm) || "chapter".equals(scopeNorm)) {
            String id = itemId == null ? "" : itemId.trim();
            if (id.isBlank()) {
                return;
            }
            String groupKey = "character".equals(scopeNorm) ? "characters" : "chapters";
            Map<String, Object> groups = (Map<String, Object>) memory.computeIfAbsent(groupKey, k -> new LinkedHashMap<>());
            Map<String, Object> target = (Map<String, Object>) groups.computeIfAbsent(id, k -> new LinkedHashMap<>());
            target.putAll(patchBucket);
            return;
        }
        Map<String, Object> bucket = (Map<String, Object>) scopeBucket(memory, scopeNorm, null);
        bucket.putAll(patchBucket);
    }

    private static Map<String, Object> normalizeMemoryStatic(Map<String, Object> raw) {
        Map<String, Object> out = deepCopyEmpty();
        if (raw == null) {
            return out;
        }
        out.put("novel", castStringMap(raw.get("novel")));
        out.put("world", castStringMap(raw.get("world")));
        out.put("background", castStringMap(raw.get("background")));
        out.put("characters", castNestedMap(raw.get("characters")));
        out.put("chapters", castNestedMap(raw.get("chapters")));
        return out;
    }

    private static Map<String, Object> snapshotScopeBucket(Map<String, Object> bucket) {
        return new LinkedHashMap<>(bucket);
    }

    private void assertNovelOwned(String userId, String novelId) {
        Long uid = parseUserId(userId);
        if (uid == null || novelId == null || novelId.isBlank()) {
            throw ContentExceptions.badRequest(ResultCode.CONTENT_INVALID_OWNER, "invalid user/novel");
        }
        novelRepository.findByIdAndUserId(novelId, uid)
            .orElseThrow(ContentExceptions::novelNotFound);
    }

    private static boolean isMemoryEmpty(Map<String, Object> memory) {
        if (memory == null || memory.isEmpty()) {
            return true;
        }
        for (String bucket : new String[] {"novel", "world", "background", "characters", "chapters"}) {
            Object raw = memory.get(bucket);
            if (raw instanceof Map<?, ?> map && !map.isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private String renderMemoryText(Map<String, Object> memory, int maxLen) {
        StringBuilder sb = new StringBuilder();
        appendFlatSection(sb, "小说信息", castStringMap(memory.get("novel")));
        appendFlatSection(sb, "世界观设定", castStringMap(memory.get("world")));
        appendFlatSection(sb, "背景设定", castStringMap(memory.get("background")));
        appendNestedSection(sb, "人物塑造", castNestedMap(memory.get("characters")));
        appendNestedSection(sb, "章节记忆", castNestedMap(memory.get("chapters")));
        String text = sb.toString().trim();
        if (text.length() > maxLen) {
            return text.substring(0, maxLen) + "…";
        }
        return text;
    }

    private static Long parseUserId(String userId) {
        if (userId == null || userId.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(userId.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static String sessionMemoryKey(String userId, String sessionId) {
        return SESSION_MEMORY_KEY_PREFIX + userId + ":" + sessionId;
    }

    private static String novelMemoryKey(String userId, String novelId) {
        return NOVEL_MEMORY_KEY_PREFIX + userId + ":" + novelId;
    }

    private static Map<String, Object> deepCopyEmpty() {
        Map<String, Object> copy = new LinkedHashMap<>();
        copy.put("novel", new LinkedHashMap<>());
        copy.put("world", new LinkedHashMap<>());
        copy.put("characters", new LinkedHashMap<>());
        copy.put("chapters", new LinkedHashMap<>());
        copy.put("background", new LinkedHashMap<>());
        return copy;
    }

    private Map<String, Object> normalizeMemory(Map<String, Object> raw) {
        Map<String, Object> out = deepCopyEmpty();
        if (raw == null) {
            return out;
        }
        out.put("novel", castStringMap(raw.get("novel")));
        out.put("world", castStringMap(raw.get("world")));
        out.put("background", castStringMap(raw.get("background")));
        out.put("characters", castNestedMap(raw.get("characters")));
        out.put("chapters", castNestedMap(raw.get("chapters")));
        return out;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> scopeBucket(Map<String, Object> memory, String scope, String itemId) {
        if ("character".equals(scope)) {
            Map<String, Object> characters = (Map<String, Object>) memory.computeIfAbsent("characters", k -> new LinkedHashMap<>());
            String id = itemId == null || itemId.isBlank() ? "" : itemId.trim();
            if (id.isBlank()) {
                throw ContentExceptions.badRequest("item_id required for character scope");
            }
            return (Map<String, Object>) characters.computeIfAbsent(id, k -> new LinkedHashMap<>());
        }
        if ("chapter".equals(scope)) {
            Map<String, Object> chapters = (Map<String, Object>) memory.computeIfAbsent("chapters", k -> new LinkedHashMap<>());
            String id = itemId == null || itemId.isBlank() ? "" : itemId.trim();
            if (id.isBlank()) {
                throw ContentExceptions.badRequest("item_id required for chapter scope");
            }
            return (Map<String, Object>) chapters.computeIfAbsent(id, k -> new LinkedHashMap<>());
        }
        if ("world".equals(scope)) {
            return (Map<String, Object>) memory.computeIfAbsent("world", k -> new LinkedHashMap<>());
        }
        if ("background".equals(scope)) {
            return (Map<String, Object>) memory.computeIfAbsent("background", k -> new LinkedHashMap<>());
        }
        return (Map<String, Object>) memory.computeIfAbsent("novel", k -> new LinkedHashMap<>());
    }

    private static final String CHARACTER_CARD_KEY = "人物卡";

    private static boolean isKnownCharacterFieldKey(String key) {
        if (key == null || key.isBlank()) {
            return false;
        }
        return switch (key.trim()) {
            case "外貌", "性格", "定位", "基本信息", "人物卡", "背景", "能力", "能力定位",
                 "能力现状", "核心动机", "立场", "剧情价值", "隐藏秘密", "name" -> true;
            default -> false;
        };
    }

    private static String fuzzyMatchCharacterName(
        String query,
        Map<String, Map<String, String>> roster
    ) {
        if (query == null || query.isBlank() || roster == null || roster.isEmpty()) {
            return null;
        }
        String q = query.trim();
        if (roster.containsKey(q)) {
            return q;
        }
        String qLower = q.toLowerCase();
        for (String name : roster.keySet()) {
            if (name.toLowerCase().equals(qLower)) {
                return name;
            }
        }
        List<String> hits = new ArrayList<>();
        for (String name : roster.keySet()) {
            if (name.contains(q) || q.contains(name)) {
                hits.add(name);
            }
        }
        if (hits.isEmpty()) {
            return null;
        }
        if (hits.size() == 1) {
            return hits.get(0);
        }
        List<String> prefixHits = new ArrayList<>();
        for (String name : hits) {
            if (name.startsWith(q) || q.startsWith(name)) {
                prefixHits.add(name);
            }
        }
        if (prefixHits.size() == 1) {
            return prefixHits.get(0);
        }
        hits.sort((a, b) -> {
            int aScore = a.contains(q) ? 0 : 1;
            int bScore = b.contains(q) ? 0 : 1;
            if (aScore != bScore) {
                return Integer.compare(aScore, bScore);
            }
            int diff = Integer.compare(Math.abs(a.length() - q.length()), Math.abs(b.length() - q.length()));
            if (diff != 0) {
                return diff;
            }
            return Integer.compare(a.length(), b.length());
        });
        return hits.get(0);
    }

    /** Returns [bucketId, fieldKey, errorReason]. */
    private static String[] resolveCharacterPatch(
        Map<String, Map<String, String>> characters,
        String key,
        String itemId
    ) {
        String keyNorm = key == null ? "" : key.trim();
        String idNorm = itemId == null ? "" : itemId.trim();
        if (!idNorm.isBlank()) {
            String matched = fuzzyMatchCharacterName(idNorm, characters);
            return new String[] {matched != null ? matched : idNorm, keyNorm, null};
        }
        String matched = fuzzyMatchCharacterName(keyNorm, characters);
        if (matched != null) {
            return new String[] {matched, CHARACTER_CARD_KEY, null};
        }
        if (isKnownCharacterFieldKey(keyNorm)) {
            return new String[] {
                null,
                null,
                "character scope: key 应为角色名（支持模糊匹配），更新具体字段请同时提供 item_id"
            };
        }
        if (keyNorm.isBlank()) {
            return new String[] {null, null, "item_id required for character write"};
        }
        return new String[] {keyNorm, CHARACTER_CARD_KEY, null};
    }

    private static StoryMemoryReadSliceDTO buildMemoryReadSlice(
        Map<String, Object> memory,
        String scope,
        String key,
        String itemId,
        Integer offset,
        Integer limit
    ) {
        String scopeNorm = normalizeScope(scope);
        if (!isValidScope(scopeNorm)) {
            throw ContentExceptions.badRequest(ResultCode.CONTENT_SCOPE_INVALID, "unsupported scope: " + scope);
        }
        String formatted = StoryMemoryAgentReadFormatter.format(memory, scope, key, itemId);
        String entryKey = resolveMemoryEntryKey(scopeNorm, key, itemId);
        String entryTitle = resolveMemoryEntryTitle(formatted, entryKey);
        String[] allLines = formatted.split("\\R", -1);
        int total = allLines.length;
        int start = offset == null || offset < 1 ? 0 : offset - 1;
        if (start >= total) {
            String hint = String.format(
                "[记忆共 %d 行；offset=%d 超出范围，请从 offset=1 重读]",
                total,
                start + 1
            );
            return new StoryMemoryReadSliceDTO(
                scopeNorm,
                StoryMemoryAgentReadFormatter.scopeDisplayLabel(scopeNorm),
                entryKey,
                entryTitle,
                total,
                total > 0 ? total : 1,
                0,
                false,
                null,
                hint
            );
        }
        start = Math.min(start, total);
        int end = total;
        if (limit != null && limit > 0) {
            end = Math.min(total, start + limit);
        }
        String[] slice = java.util.Arrays.copyOfRange(allLines, start, end);
        int returned = slice.length;
        boolean hasMore = end < total;
        Integer nextOffset = hasMore ? end + 1 : null;
        int offsetOut = start + 1;
        String text = formatMemoryNumberedLines(slice, offsetOut);
        if (hasMore && nextOffset != null) {
            text += String.format(
                "%n%n[记忆共 %d 行，本次 %d 行；续读 offset=%d limit=…]",
                total,
                returned,
                nextOffset
            );
        }
        return new StoryMemoryReadSliceDTO(
            scopeNorm,
            StoryMemoryAgentReadFormatter.scopeDisplayLabel(scopeNorm),
            entryKey,
            entryTitle,
            total,
            offsetOut,
            returned,
            hasMore,
            nextOffset,
            text
        );
    }

    private static String resolveMemoryEntryKey(String scopeNorm, String key, String itemId) {
        String keyNorm = key == null ? "" : key.trim();
        String itemNorm = itemId == null ? "" : itemId.trim();
        if ("character".equals(scopeNorm) || "chapter".equals(scopeNorm)) {
            if (!itemNorm.isBlank()) {
                return itemNorm;
            }
            if (!keyNorm.isBlank() && !"*".equals(keyNorm)) {
                return keyNorm;
            }
            return "";
        }
        if (!itemNorm.isBlank()) {
            return itemNorm;
        }
        return keyNorm;
    }

    private static String resolveMemoryEntryTitle(String formatted, String fallback) {
        for (String line : formatted.split("\\R")) {
            String trimmed = line.trim();
            if (trimmed.startsWith("- title:")) {
                String title = trimmed.substring("- title:".length()).trim();
                if (!title.isBlank()) {
                    return title;
                }
            }
            int dot = trimmed.indexOf('·');
            if (trimmed.startsWith("# ") && dot > 0) {
                String after = trimmed.substring(dot + 1).trim();
                if (!after.isBlank()) {
                    return after;
                }
            }
        }
        return fallback == null ? "" : fallback;
    }

    private static String formatMemoryNumberedLines(String[] lines, int firstLineNumber) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < lines.length; i++) {
            sb.append(String.format("%6d\t%s%n", firstLineNumber + i, lines[i]));
        }
        return sb.toString().stripTrailing();
    }

    private static boolean isValidScope(String scope) {
        return "novel".equals(scope)
            || "world".equals(scope)
            || "character".equals(scope)
            || "chapter".equals(scope)
            || "background".equals(scope);
    }

    static String normalizeScope(String scope) {
        if (scope == null) {
            return "";
        }
        String raw = scope.trim().toLowerCase();
        return switch (raw) {
            case "worldbuilding", "world_building", "worldview", "setting", "settings", "世界观" -> "world";
            case "characters", "char", "person", "人物" -> "character";
            case "chapters", "chapter_memory", "章节" -> "chapter";
            case "backgrounds", "背景设定" -> "background";
            default -> raw;
        };
    }

    @SuppressWarnings("unchecked")
    private static Map<String, String> castStringMap(Object raw) {
        if (!(raw instanceof Map<?, ?> map)) {
            return new LinkedHashMap<>();
        }
        Map<String, String> out = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : map.entrySet()) {
            if (entry.getKey() != null && entry.getValue() != null) {
                out.put(String.valueOf(entry.getKey()), String.valueOf(entry.getValue()));
            }
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Map<String, String>> castNestedMap(Object raw) {
        if (!(raw instanceof Map<?, ?> map)) {
            return new LinkedHashMap<>();
        }
        Map<String, Map<String, String>> out = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : map.entrySet()) {
            if (entry.getKey() == null || !(entry.getValue() instanceof Map<?, ?> nested)) {
                continue;
            }
            out.put(String.valueOf(entry.getKey()), castStringMap(nested));
        }
        return out;
    }

    private static void appendFlatSection(StringBuilder sb, String title, Map<String, String> rows) {
        if (rows == null || rows.isEmpty()) {
            return;
        }
        sb.append(title).append(":\n");
        for (Map.Entry<String, String> entry : rows.entrySet()) {
            sb.append("- ").append(entry.getKey()).append(": ").append(entry.getValue()).append('\n');
        }
    }

    private static void appendNestedSection(StringBuilder sb, String title, Map<String, Map<String, String>> groups) {
        if (groups == null || groups.isEmpty()) {
            return;
        }
        sb.append(title).append(":\n");
        for (Map.Entry<String, Map<String, String>> group : groups.entrySet()) {
            sb.append("- ").append(group.getKey()).append(":\n");
            for (Map.Entry<String, String> entry : group.getValue().entrySet()) {
                sb.append("  - ").append(entry.getKey()).append(": ").append(entry.getValue()).append('\n');
            }
        }
    }
}
