package com.novel.agent.content.controller.auth;

import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.service.BaseController;
import com.novel.agent.content.dto.ClearStoryMemoryRequest;
import com.novel.agent.content.dto.DeleteStoryMemoryRequest;
import com.novel.agent.content.dto.PatchStoryMemoryRequest;
import com.novel.agent.content.dto.PersistStoryMemoryRequest;
import com.novel.agent.content.dto.StoryMemoryReadSliceDTO;
import com.novel.agent.content.service.auth.biz.AuthStoryMemoryBiz;
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
@RequestMapping("/api/content/auth/novels/{novelId}/story-memory")
@RequiredArgsConstructor
public class AuthNovelStoryMemoryController extends BaseController {

    private final AuthStoryMemoryBiz biz;

    @GetMapping("/read")
    public Result<StoryMemoryReadSliceDTO> readSlice(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId,
        @RequestParam(name = "scope") String scope,
        @RequestParam(name = "key", required = false) String key,
        @RequestParam(name = "itemId", required = false) String itemId,
        @RequestParam(name = "offset", required = false) Integer offset,
        @RequestParam(name = "limit", required = false) Integer limit
    ) {
        return biz.readNovelSlice(parseUserId(userId), novelId, scope, key, itemId, offset, limit);
    }

    @GetMapping
    public Result<Map<String, Object>> getMemory(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId
    ) {
        return biz.getNovelMemory(parseUserId(userId), novelId);
    }

    @PostMapping("/patch")
    public Result<Map<String, Object>> patchMemory(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId,
        @Valid @RequestBody PatchStoryMemoryRequest request
    ) {
        return biz.patchNovelMemory(parseUserId(userId), novelId, request);
    }

    @PostMapping("/delete")
    public Result<Map<String, Object>> deleteMemory(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId,
        @Valid @RequestBody DeleteStoryMemoryRequest request
    ) {
        return biz.deleteNovelMemory(parseUserId(userId), novelId, request);
    }

    @PostMapping("/clear")
    public Result<Map<String, Object>> clearMemory(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId,
        @Valid @RequestBody ClearStoryMemoryRequest request
    ) {
        return biz.clearNovelMemory(parseUserId(userId), novelId, request);
    }

    @PostMapping("/internal/persist")
    public Result<Map<String, Object>> persistCold(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId,
        @Valid @RequestBody PersistStoryMemoryRequest request
    ) {
        return biz.persistNovelCold(parseUserId(userId), novelId, request);
    }
}
