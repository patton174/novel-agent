package com.novel.agent.content.controller;

import com.novel.agent.content.dto.ChapterVersionDTO;
import com.novel.agent.content.service.ChapterService;
import com.novel.agent.content.service.ChapterVersionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.novel.agent.content.dto.ChapterDTO;

import java.util.List;

@RestController
@RequestMapping("/api/content/chapters/{chapterId}/versions")
@RequiredArgsConstructor
public class ChapterVersionController {

    private final ChapterVersionService versionService;
    private final ChapterService chapterService;

    @GetMapping
    public ResponseEntity<List<ChapterVersionDTO>> list(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String chapterId,
        @RequestParam(name = "limit", defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(versionService.listVersions(parseUserId(userId), chapterId, limit));
    }

    @PostMapping("/{versionId}/restore")
    public ResponseEntity<ChapterDTO> restore(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String chapterId,
        @PathVariable String versionId
    ) {
        return ResponseEntity.ok(chapterService.restoreVersion(parseUserId(userId), chapterId, versionId));
    }

    private static Long parseUserId(String userIdHeader) {
        return Long.parseLong(userIdHeader.trim());
    }
}
