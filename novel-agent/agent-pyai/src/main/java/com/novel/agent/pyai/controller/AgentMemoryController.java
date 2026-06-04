package com.novel.agent.pyai.controller;

import com.novel.agent.pyai.service.StoryMemoryClient;
import com.novel.agent.pyai.support.BlockingWebSupport;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/agent/memory")
public class AgentMemoryController {

    private static final String USER_ID_HEADER = "X-User-Id";

    private final StoryMemoryClient storyMemoryClient;
    private final BlockingWebSupport blockingWebSupport;

    public AgentMemoryController(
        StoryMemoryClient storyMemoryClient,
        BlockingWebSupport blockingWebSupport
    ) {
        this.storyMemoryClient = storyMemoryClient;
        this.blockingWebSupport = blockingWebSupport;
    }

    @GetMapping("/novel/{novelId}")
    public Mono<Map<String, Object>> getNovelMemory(
        @RequestHeader(name = USER_ID_HEADER, required = false) String userIdHeader,
        @PathVariable("novelId") String novelId
    ) {
        Long userId = parseUserId(userIdHeader);
        return blockingWebSupport.mono(() -> {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("novel_id", novelId);
            body.put("memory", storyMemoryClient.loadMemory(userId, novelId));
            return body;
        });
    }

    @PostMapping(value = "/novel/{novelId}/patch", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, Object>> patchNovelMemory(
        @RequestHeader(name = USER_ID_HEADER, required = false) String userIdHeader,
        @PathVariable("novelId") String novelId,
        @RequestBody Map<String, Object> body
    ) {
        Long userId = parseUserId(userIdHeader);
        if (userId == null || userId <= 0) {
            return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "user id required"));
        }
        return blockingWebSupport.mono(() -> {
            Map<String, Object> result = storyMemoryClient.patchMemory(userId, novelId, body);
            if (Boolean.FALSE.equals(result.get("ok"))) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    String.valueOf(result.getOrDefault("reason", "patch failed"))
                );
            }
            Map<String, Object> response = new LinkedHashMap<>(result);
            response.put("novel_id", novelId);
            if (!response.containsKey("memory")) {
                response.put("memory", storyMemoryClient.loadMemory(userId, novelId));
            }
            return response;
        });
    }

    @PostMapping(value = "/novel/{novelId}/delete", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, Object>> deleteNovelMemory(
        @RequestHeader(name = USER_ID_HEADER, required = false) String userIdHeader,
        @PathVariable("novelId") String novelId,
        @RequestBody Map<String, Object> body
    ) {
        Long userId = parseUserId(userIdHeader);
        if (userId == null || userId <= 0) {
            return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "user id required"));
        }
        return blockingWebSupport.mono(() -> {
            Map<String, Object> result = storyMemoryClient.deleteMemory(userId, novelId, body);
            if (Boolean.FALSE.equals(result.get("ok"))) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    String.valueOf(result.getOrDefault("reason", "delete failed"))
                );
            }
            Map<String, Object> response = new LinkedHashMap<>(result);
            response.put("novel_id", novelId);
            if (!response.containsKey("memory")) {
                response.put("memory", storyMemoryClient.loadMemory(userId, novelId));
            }
            return response;
        });
    }

    @PostMapping(value = "/novel/{novelId}/clear", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, Object>> clearNovelMemory(
        @RequestHeader(name = USER_ID_HEADER, required = false) String userIdHeader,
        @PathVariable("novelId") String novelId,
        @RequestBody Map<String, Object> body
    ) {
        Long userId = parseUserId(userIdHeader);
        if (userId == null || userId <= 0) {
            return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "user id required"));
        }
        return blockingWebSupport.mono(() -> {
            Map<String, Object> result = storyMemoryClient.clearMemoryScope(userId, novelId, body);
            if (Boolean.FALSE.equals(result.get("ok"))) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    String.valueOf(result.getOrDefault("reason", "clear failed"))
                );
            }
            Map<String, Object> response = new LinkedHashMap<>(result);
            response.put("novel_id", novelId);
            response.put("memory", storyMemoryClient.loadMemory(userId, novelId));
            return response;
        });
    }

    @GetMapping("/{sessionId}")
    public Mono<Map<String, Object>> getMemory(
        @RequestHeader(name = USER_ID_HEADER, required = false) String userIdHeader,
        @PathVariable("sessionId") String sessionId
    ) {
        Long userId = parseUserId(userIdHeader);
        return blockingWebSupport.mono(() -> {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("session_id", sessionId);
            body.put("memory", storyMemoryClient.loadMemoryBySession(userId, sessionId));
            return body;
        });
    }

    @PostMapping(value = "/{sessionId}/patch", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, Object>> patchMemory(
        @RequestHeader(name = USER_ID_HEADER, required = false) String userIdHeader,
        @PathVariable("sessionId") String sessionId,
        @RequestBody Map<String, Object> body
    ) {
        Long userId = parseUserId(userIdHeader);
        if (userId == null || userId <= 0) {
            return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "user id required"));
        }
        return Mono.error(new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "use /api/agent/memory/novel/{novelId}/patch for story memory updates"
        ));
    }

    private static Long parseUserId(String userIdHeader) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(userIdHeader.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
