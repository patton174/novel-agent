package com.novel.agent.content.controller;

import com.novel.agent.content.dto.ChapterSearchHitDTO;
import com.novel.agent.content.service.ChapterService;
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
@RequestMapping("/api/content/novels/{novelId}/search")
@RequiredArgsConstructor
public class NovelSearchController {

    private final ChapterService chapterService;

    @GetMapping
    public ResponseEntity<List<ChapterSearchHitDTO>> search(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String novelId,
        @RequestParam(name = "q") String query,
        @RequestParam(name = "limit", defaultValue = "5") int limit
    ) {
        return ResponseEntity.ok(
            chapterService.searchChapters(Long.parseLong(userId.trim()), novelId, query, limit)
        );
    }
}
