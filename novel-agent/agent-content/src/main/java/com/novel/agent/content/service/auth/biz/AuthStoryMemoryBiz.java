package com.novel.agent.content.service.auth.biz;

import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.content.dto.ClearStoryMemoryRequest;
import com.novel.agent.content.dto.DeleteStoryMemoryRequest;
import com.novel.agent.content.dto.PatchStoryMemoryRequest;
import com.novel.agent.content.dto.PersistStoryMemoryRequest;
import com.novel.agent.content.dto.StoryMemoryReadSliceDTO;
import com.novel.agent.content.service.StoryMemoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AuthStoryMemoryBiz extends BaseBiz {

    private final StoryMemoryService storyMemoryService;

    public Result<StoryMemoryReadSliceDTO> readSessionSlice(
        Long userId,
        String sessionId,
        String scope,
        String key,
        String itemId,
        Integer offset,
        Integer limit
    ) {
        return ok(storyMemoryService.readSessionMemorySlice(
            userKey(userId), sessionId, scope, key, itemId, offset, limit
        ));
    }

    public Result<Map<String, Object>> getSessionMemory(Long userId, String sessionId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("session_id", sessionId);
        body.put("memory", storyMemoryService.getMemory(userKey(userId), sessionId));
        return ok(body);
    }

    public Result<Map<String, Object>> patchSessionMemory(
        Long userId,
        String sessionId,
        PatchStoryMemoryRequest request
    ) {
        String userKey = userKey(userId);
        Map<String, Object> result = storyMemoryService.patchMemory(
            userKey, sessionId, request.scope(), request.key(), request.value(), request.itemId()
        );
        requireMemoryOk(result, "记忆更新失败");
        Map<String, Object> body = new LinkedHashMap<>(result);
        body.put("session_id", sessionId);
        body.put("memory", storyMemoryService.getMemory(userKey, sessionId));
        return ok(body);
    }

    public Result<Map<String, Object>> deleteSessionMemory(
        Long userId,
        String sessionId,
        DeleteStoryMemoryRequest request
    ) {
        String userKey = userKey(userId);
        Map<String, Object> result = storyMemoryService.deleteMemory(
            userKey, sessionId, request.scope(), request.key(), request.itemId()
        );
        requireMemoryOk(result, "记忆删除失败");
        Map<String, Object> body = new LinkedHashMap<>(result);
        body.put("session_id", sessionId);
        body.put("memory", storyMemoryService.getMemory(userKey, sessionId));
        return ok(body);
    }

    public Result<Map<String, Object>> persistSessionCold(
        Long userId,
        String sessionId,
        PersistStoryMemoryRequest request
    ) {
        storyMemoryService.persistCold(userKey(userId), sessionId, request.memory());
        return ok(Map.of("ok", true, "session_id", sessionId));
    }

    public Result<StoryMemoryReadSliceDTO> readNovelSlice(
        Long userId,
        String novelId,
        String scope,
        String key,
        String itemId,
        Integer offset,
        Integer limit
    ) {
        return ok(storyMemoryService.readNovelMemorySlice(
            userKey(userId), novelId, scope, key, itemId, offset, limit
        ));
    }

    public Result<Map<String, Object>> getNovelMemory(Long userId, String novelId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("novel_id", novelId);
        body.put("memory", storyMemoryService.getNovelMemory(userKey(userId), novelId));
        return ok(body);
    }

    public Result<Map<String, Object>> patchNovelMemory(
        Long userId,
        String novelId,
        PatchStoryMemoryRequest request
    ) {
        String userKey = userKey(userId);
        Map<String, Object> result = storyMemoryService.patchNovelMemory(
            userKey, novelId, request.scope(), request.key(), request.value(), request.itemId()
        );
        requireMemoryOk(result, "记忆更新失败");
        Map<String, Object> body = new LinkedHashMap<>(result);
        body.put("novel_id", novelId);
        body.put("memory", storyMemoryService.getNovelMemory(userKey, novelId));
        return ok(body);
    }

    public Result<Map<String, Object>> deleteNovelMemory(
        Long userId,
        String novelId,
        DeleteStoryMemoryRequest request
    ) {
        String userKey = userKey(userId);
        Map<String, Object> result = storyMemoryService.deleteNovelMemory(
            userKey, novelId, request.scope(), request.key(), request.itemId()
        );
        requireMemoryOk(result, "记忆删除失败");
        Map<String, Object> body = new LinkedHashMap<>(result);
        body.put("novel_id", novelId);
        body.put("memory", storyMemoryService.getNovelMemory(userKey, novelId));
        return ok(body);
    }

    public Result<Map<String, Object>> clearNovelMemory(
        Long userId,
        String novelId,
        ClearStoryMemoryRequest request
    ) {
        String userKey = userKey(userId);
        Map<String, Object> result = storyMemoryService.clearNovelMemoryScope(userKey, novelId, request.scope());
        requireMemoryOk(result, "记忆清空失败");
        Map<String, Object> body = new LinkedHashMap<>(result);
        body.put("novel_id", novelId);
        body.put("memory", storyMemoryService.getNovelMemory(userKey, novelId));
        return ok(body);
    }

    public Result<Map<String, Object>> persistNovelCold(
        Long userId,
        String novelId,
        PersistStoryMemoryRequest request
    ) {
        storyMemoryService.persistNovelCold(userKey(userId), novelId, request.memory());
        return ok(Map.of("ok", true, "novel_id", novelId));
    }

    private String userKey(Long userId) {
        return String.valueOf(userId);
    }

    private void requireMemoryOk(Map<String, Object> result, String defaultMessage) {
        if (Boolean.FALSE.equals(result.get("ok"))) {
            badRequest(
                ResultCode.STORY_MEMORY_FAILED,
                String.valueOf(result.getOrDefault("message", defaultMessage))
            );
        }
    }
}
