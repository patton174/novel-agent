package com.novel.agent.content.controller;

import com.novel.agent.content.dto.AppendMessageRequest;
import com.novel.agent.content.dto.BatchDeleteSessionsRequest;
import com.novel.agent.content.dto.ContentMessageDTO;
import com.novel.agent.content.dto.SaveRunTraceRequest;
import com.novel.agent.content.dto.SessionDTO;
import com.novel.agent.content.dto.UpsertSessionRequest;
import com.novel.agent.content.service.ContentSessionService;
import com.novel.agent.content.service.StoryMemoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/content/sessions")
@RequiredArgsConstructor
public class ContentSessionController {
    private final ContentSessionService sessionService;
    private final StoryMemoryService storyMemoryService;

    @GetMapping
    public ResponseEntity<List<SessionDTO>> list(
        @RequestHeader(name = "X-User-Id") String userId,
        @RequestParam(name = "limit", defaultValue = "50") int limit
    ) {
        return ResponseEntity.ok(sessionService.listSessions(userId, limit));
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<SessionDTO> get(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "sessionId") String sessionId
    ) {
        SessionDTO session = sessionService.getSession(userId, sessionId);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(session);
    }

    @PostMapping("/upsert")
    public ResponseEntity<Map<String, Object>> upsert(
        @RequestHeader(name = "X-User-Id") String userId,
        @Valid @RequestBody UpsertSessionRequest request
    ) {
        sessionService.upsertSession(userId, request.sessionId(), request.title(), request.novelId());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @DeleteMapping("/{sessionId}")
    public ResponseEntity<Map<String, Object>> delete(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "sessionId") String sessionId
    ) {
        if (!sessionService.deleteSession(userId, sessionId)) {
            return ResponseEntity.notFound().build();
        }
        storyMemoryService.purgeSessionMemory(userId, sessionId);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/batch-delete")
    public ResponseEntity<Map<String, Object>> batchDelete(
        @RequestHeader(name = "X-User-Id") String userId,
        @Valid @RequestBody BatchDeleteSessionsRequest request
    ) {
        int deleted = 0;
        for (String sessionId : request.sessionIds()) {
            if (sessionService.deleteSession(userId, sessionId)) {
                storyMemoryService.purgeSessionMemory(userId, sessionId);
                deleted++;
            }
        }
        return ResponseEntity.ok(Map.of("ok", true, "deleted", deleted));
    }

    @GetMapping("/{sessionId}/messages")
    public ResponseEntity<List<ContentMessageDTO>> listMessages(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "sessionId") String sessionId,
        @RequestParam(name = "limit", defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(sessionService.listMessages(userId, sessionId, limit));
    }

    @PutMapping("/{sessionId}/runs/{runId}/trace")
    public ResponseEntity<Map<String, Object>> saveRunTrace(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "sessionId") String sessionId,
        @PathVariable(name = "runId") String runId,
        @Valid @RequestBody SaveRunTraceRequest request
    ) {
        if (!runId.equals(request.runId())) {
            return ResponseEntity.badRequest().body(Map.of("ok", false, "message", "runId mismatch"));
        }
        sessionService.saveRunTrace(userId, sessionId, runId, request.traceJson() == null ? "" : request.traceJson());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/{sessionId}/messages")
    public ResponseEntity<Map<String, Object>> appendMessage(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "sessionId") String sessionId,
        @Valid @RequestBody AppendMessageRequest request
    ) {
        if (!sessionId.equals(request.sessionId())) {
            return ResponseEntity.badRequest().body(Map.of("ok", false, "message", "session mismatch"));
        }
        sessionService.appendMessage(
            userId,
            sessionId,
            request.role(),
            request.content(),
            request.runId(),
            request.messageId(),
            request.mode()
        );
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
