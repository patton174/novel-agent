package com.novel.agent.content.controller;

import com.novel.agent.content.dto.ChapterDTO;
import com.novel.agent.content.dto.ChapterSummaryDTO;
import com.novel.agent.content.dto.CreateChapterRequest;
import com.novel.agent.content.dto.CreateNovelRequest;
import com.novel.agent.content.dto.NovelDTO;
import com.novel.agent.content.dto.ReindexStatusDTO;
import com.novel.agent.content.dto.ReorderIdsRequest;
import com.novel.agent.content.dto.UpdateChapterRequest;
import com.novel.agent.content.dto.UpdateNovelRequest;
import com.novel.agent.content.service.ChapterService;
import com.novel.agent.content.service.NovelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Map;

@RestController
@RequestMapping("/api/content/novels")
@RequiredArgsConstructor
public class NovelController {

    private final NovelService novelService;
    private final ChapterService chapterService;

    @GetMapping
    public ResponseEntity<List<NovelDTO>> list(
        @RequestHeader(name = "X-User-Id") String userId
    ) {
        return ResponseEntity.ok(novelService.listNovels(parseUserId(userId)));
    }

    @PostMapping
    public ResponseEntity<NovelDTO> create(
        @RequestHeader(name = "X-User-Id") String userId,
        @Valid @RequestBody CreateNovelRequest request
    ) {
        return ResponseEntity.ok(novelService.createNovel(parseUserId(userId), request));
    }

    @GetMapping("/{novelId}")
    public ResponseEntity<NovelDTO> get(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String novelId
    ) {
        return ResponseEntity.ok(novelService.getNovel(parseUserId(userId), novelId));
    }

    @PutMapping("/{novelId}")
    public ResponseEntity<NovelDTO> update(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String novelId,
        @Valid @RequestBody UpdateNovelRequest request
    ) {
        return ResponseEntity.ok(novelService.updateNovel(parseUserId(userId), novelId, request));
    }

    @DeleteMapping("/{novelId}")
    public ResponseEntity<Map<String, Object>> delete(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String novelId
    ) {
        novelService.deleteNovel(parseUserId(userId), novelId);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/{novelId}/chapters")
    public ResponseEntity<List<ChapterSummaryDTO>> listChapters(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String novelId
    ) {
        return ResponseEntity.ok(chapterService.listSummaries(parseUserId(userId), novelId));
    }

    @PostMapping("/{novelId}/chapters")
    public ResponseEntity<ChapterDTO> createChapter(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String novelId,
        @Valid @RequestBody CreateChapterRequest request
    ) {
        return ResponseEntity.ok(chapterService.createChapter(parseUserId(userId), novelId, request));
    }

    @PostMapping("/{novelId}/chapters/reorder")
    public ResponseEntity<List<ChapterSummaryDTO>> reorderChapters(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String novelId,
        @Valid @RequestBody ReorderIdsRequest request
    ) {
        return ResponseEntity.ok(
            chapterService.reorderNovelChapters(parseUserId(userId), novelId, request.ids())
        );
    }

    @PostMapping("/{novelId}/reindex")
    public ResponseEntity<ReindexStatusDTO> reindex(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String novelId
    ) {
        return ResponseEntity.accepted().body(chapterService.reindexNovel(parseUserId(userId), novelId));
    }

    @GetMapping("/{novelId}/reindex/status")
    public ResponseEntity<ReindexStatusDTO> reindexStatus(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String novelId
    ) {
        return ResponseEntity.ok(chapterService.getReindexStatus(parseUserId(userId), novelId));
    }

    private static Long parseUserId(String userIdHeader) {
        return Long.parseLong(userIdHeader.trim());
    }
}
