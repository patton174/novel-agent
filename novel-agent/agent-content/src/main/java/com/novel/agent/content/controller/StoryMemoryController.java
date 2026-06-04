package com.novel.agent.content.controller;

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
@RequestMapping("/api/content/sessions/{sessionId}/story-memory")
@RequiredArgsConstructor
public class StoryMemoryController {

    private final StoryMemoryService storyMemoryService;

    @GetMapping("/read")
    public ResponseEntity<StoryMemoryReadSliceDTO> readSlice(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "sessionId") String sessionId,
        @RequestParam(name = "scope") String scope,
        @RequestParam(name = "key", required = false) String key,
        @RequestParam(name = "itemId", required = false) String itemId,
        @RequestParam(name = "offset", required = false) Integer offset,
        @RequestParam(name = "limit", required = false) Integer limit
    ) {
        return ResponseEntity.ok(
            storyMemoryService.readSessionMemorySlice(userId, sessionId, scope, key, itemId, offset, limit)
        );
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getMemory(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "sessionId") String sessionId
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("session_id", sessionId);
        body.put("memory", storyMemoryService.getMemory(userId, sessionId));
        return ResponseEntity.ok(body);
    }

    @PostMapping("/patch")
    public ResponseEntity<Map<String, Object>> patchMemory(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "sessionId") String sessionId,
        @Valid @RequestBody PatchStoryMemoryRequest request
    ) {
        Map<String, Object> result = storyMemoryService.patchMemory(
            userId,
            sessionId,
            request.scope(),
            request.key(),
            request.value(),
            request.itemId()
        );
        Map<String, Object> body = new LinkedHashMap<>(result);
        body.put("session_id", sessionId);
        body.put("memory", storyMemoryService.getMemory(userId, sessionId));
        if (Boolean.FALSE.equals(result.get("ok"))) {
            return ResponseEntity.badRequest().body(body);
        }
        return ResponseEntity.ok(body);
    }

    @PostMapping("/delete")
    public ResponseEntity<Map<String, Object>> deleteMemory(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "sessionId") String sessionId,
        @Valid @RequestBody DeleteStoryMemoryRequest request
    ) {
        Map<String, Object> result = storyMemoryService.deleteMemory(
            userId,
            sessionId,
            request.scope(),
            request.key(),
            request.itemId()
        );
        Map<String, Object> body = new LinkedHashMap<>(result);
        body.put("session_id", sessionId);
        body.put("memory", storyMemoryService.getMemory(userId, sessionId));
        if (Boolean.FALSE.equals(result.get("ok"))) {
            return ResponseEntity.badRequest().body(body);
        }
        return ResponseEntity.ok(body);
    }

    @PostMapping("/internal/persist")
    public ResponseEntity<Map<String, Object>> persistCold(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "sessionId") String sessionId,
        @Valid @RequestBody PersistStoryMemoryRequest request
    ) {
        storyMemoryService.persistCold(userId, sessionId, request.memory());
        return ResponseEntity.ok(Map.of("ok", true, "session_id", sessionId));
    }
}
