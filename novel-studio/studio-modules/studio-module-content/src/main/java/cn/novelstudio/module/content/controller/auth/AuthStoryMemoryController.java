package cn.novelstudio.module.content.controller.auth;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import cn.novelstudio.module.content.dto.DeleteStoryMemoryRequest;
import cn.novelstudio.module.content.dto.PatchStoryMemoryRequest;
import cn.novelstudio.module.content.dto.PersistStoryMemoryRequest;
import cn.novelstudio.module.content.dto.StoryMemoryReadSliceDTO;
import cn.novelstudio.module.content.service.auth.biz.AuthStoryMemoryBiz;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/content/auth/sessions/{sessionId}/story-memory")
@RequiredArgsConstructor
public class AuthStoryMemoryController extends BaseController {

    private final AuthStoryMemoryBiz biz;

    @GetMapping("/read")
    public Result<StoryMemoryReadSliceDTO> readSlice(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "sessionId") String sessionId,
        @RequestParam(name = "scope") String scope,
        @RequestParam(name = "key", required = false) String key,
        @RequestParam(name = "itemId", required = false) String itemId,
        @RequestParam(name = "offset", required = false) Integer offset,
        @RequestParam(name = "limit", required = false) Integer limit
    ) {
        return biz.readSessionSlice(parseUserId(userId), sessionId, scope, key, itemId, offset, limit);
    }

    @GetMapping
    public Result<Map<String, Object>> getMemory(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "sessionId") String sessionId
    ) {
        return biz.getSessionMemory(parseUserId(userId), sessionId);
    }

    @PostMapping("/patch")
    public Result<Map<String, Object>> patchMemory(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "sessionId") String sessionId,
        @Valid @RequestBody PatchStoryMemoryRequest request
    ) {
        return biz.patchSessionMemory(parseUserId(userId), sessionId, request);
    }

    @PostMapping("/delete")
    public Result<Map<String, Object>> deleteMemory(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "sessionId") String sessionId,
        @Valid @RequestBody DeleteStoryMemoryRequest request
    ) {
        return biz.deleteSessionMemory(parseUserId(userId), sessionId, request);
    }

    @PostMapping("/internal/persist")
    public Result<Map<String, Object>> persistCold(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "sessionId") String sessionId,
        @Valid @RequestBody PersistStoryMemoryRequest request
    ) {
        return biz.persistSessionCold(parseUserId(userId), sessionId, request);
    }
}
