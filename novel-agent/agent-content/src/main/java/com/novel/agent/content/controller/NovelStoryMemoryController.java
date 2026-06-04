package com.novel.agent.content.controller;

import com.novel.agent.content.dto.ClearStoryMemoryRequest;
import com.novel.agent.content.dto.DeleteStoryMemoryRequest;
import com.novel.agent.content.dto.PatchStoryMemoryRequest;
import com.novel.agent.content.dto.PersistStoryMemoryRequest;
import com.novel.agent.content.dto.StoryMemoryReadSliceDTO;
import com.novel.agent.content.service.StoryMemoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/content/novels/{novelId}/story-memory")
@RequiredArgsConstructor
public class NovelStoryMemoryController {

    private final StoryMemoryService storyMemoryService;

    /** Agent Read: 1-based line offset/limit for one memory entry (scope + key/itemId). */
    @GetMapping("/read")
    public ResponseEntity<StoryMemoryReadSliceDTO> readSlice(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId,
        @RequestParam(name = "scope") String scope,
        @RequestParam(name = "key", required = false) String key,
        @RequestParam(name = "itemId", required = false) String itemId,
        @RequestParam(name = "offset", required = false) Integer offset,
        @RequestParam(name = "limit", required = false) Integer limit
    ) {
        return ResponseEntity.ok(
            storyMemoryService.readNovelMemorySlice(userId, novelId, scope, key, itemId, offset, limit)
        );
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getMemory(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("novel_id", novelId);
        body.put("memory", storyMemoryService.getNovelMemory(userId, novelId));
        return ResponseEntity.ok(body);
    }

    @PostMapping("/patch")
    public ResponseEntity<Map<String, Object>> patchMemory(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId,
        @Valid @RequestBody PatchStoryMemoryRequest request
    ) {
        Map<String, Object> result = storyMemoryService.patchNovelMemory(
            userId,
            novelId,
            request.scope(),
            request.key(),
            request.value(),
            request.itemId()
        );
        Map<String, Object> body = new LinkedHashMap<>(result);
        body.put("novel_id", novelId);
        body.put("memory", storyMemoryService.getNovelMemory(userId, novelId));
        if (Boolean.FALSE.equals(result.get("ok"))) {
            return ResponseEntity.badRequest().body(body);
        }
        return ResponseEntity.ok(body);
    }

    @PostMapping("/delete")
    public ResponseEntity<Map<String, Object>> deleteMemory(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId,
        @Valid @RequestBody DeleteStoryMemoryRequest request
    ) {
        Map<String, Object> result = storyMemoryService.deleteNovelMemory(
            userId,
            novelId,
            request.scope(),
            request.key(),
            request.itemId()
        );
        Map<String, Object> body = new LinkedHashMap<>(result);
        body.put("novel_id", novelId);
        body.put("memory", storyMemoryService.getNovelMemory(userId, novelId));
        if (Boolean.FALSE.equals(result.get("ok"))) {
            return ResponseEntity.badRequest().body(body);
        }
        return ResponseEntity.ok(body);
    }

    @PostMapping("/clear")
    public ResponseEntity<Map<String, Object>> clearMemory(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId,
        @Valid @RequestBody ClearStoryMemoryRequest request
    ) {
        Map<String, Object> result = storyMemoryService.clearNovelMemoryScope(
            userId,
            novelId,
            request.scope()
        );
        Map<String, Object> body = new LinkedHashMap<>(result);
        body.put("novel_id", novelId);
        body.put("memory", storyMemoryService.getNovelMemory(userId, novelId));
        if (Boolean.FALSE.equals(result.get("ok"))) {
            return ResponseEntity.badRequest().body(body);
        }
        return ResponseEntity.ok(body);
    }

    @PostMapping("/internal/persist")
    public ResponseEntity<Map<String, Object>> persistCold(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId,
        @Valid @RequestBody PersistStoryMemoryRequest request
    ) {
        storyMemoryService.persistNovelCold(userId, novelId, request.memory());
        return ResponseEntity.ok(Map.of("ok", true, "novel_id", novelId));
    }
}
