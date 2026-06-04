package com.novel.agent.content.controller;

import com.novel.agent.content.dto.SessionDTO;
import com.novel.agent.content.service.ContentSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/content/novels/{novelId}/sessions")
@RequiredArgsConstructor
public class NovelSessionController {

    private final ContentSessionService sessionService;

    @GetMapping
    public ResponseEntity<List<SessionDTO>> listByNovel(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String novelId,
        @RequestParam(name = "limit", defaultValue = "50") int limit
    ) {
        return ResponseEntity.ok(sessionService.listSessionsByNovel(userId, novelId, limit));
    }
}
