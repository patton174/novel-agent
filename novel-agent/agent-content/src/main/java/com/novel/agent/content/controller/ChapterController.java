package com.novel.agent.content.controller;

import com.novel.agent.content.dto.ChapterDTO;
import com.novel.agent.content.dto.ChapterReadSliceDTO;
import com.novel.agent.content.dto.UpdateChapterRequest;
import com.novel.agent.content.service.ChapterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/content/chapters")
@RequiredArgsConstructor
public class ChapterController {

    private final ChapterService chapterService;

    @GetMapping("/{chapterId}")
    public ResponseEntity<ChapterDTO> get(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String chapterId
    ) {
        return ResponseEntity.ok(chapterService.getChapter(parseUserId(userId), chapterId));
    }

    /** Agent Read: 1-based line offset/limit; omit limit to read through end of chapter. */
    @GetMapping("/{chapterId}/read")
    public ResponseEntity<ChapterReadSliceDTO> readSlice(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String chapterId,
        @RequestParam(name = "offset", required = false) Integer offset,
        @RequestParam(name = "limit", required = false) Integer limit
    ) {
        return ResponseEntity.ok(
            chapterService.readChapterSlice(parseUserId(userId), chapterId, offset, limit)
        );
    }

    @PutMapping("/{chapterId}")
    public ResponseEntity<ChapterDTO> update(
        @RequestHeader(name = "X-User-Id") String userId,
        @RequestHeader(name = "X-Edit-Source", required = false) String editSource,
        @PathVariable String chapterId,
        @Valid @RequestBody UpdateChapterRequest request
    ) {
        String source = editSource == null || editSource.isBlank() ? "user" : editSource.trim();
        return ResponseEntity.ok(
            chapterService.updateChapter(parseUserId(userId), chapterId, request, source)
        );
    }

    @DeleteMapping("/{chapterId}")
    public ResponseEntity<Map<String, Object>> delete(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String chapterId
    ) {
        chapterService.deleteChapter(parseUserId(userId), chapterId);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    private static Long parseUserId(String userIdHeader) {
        return Long.parseLong(userIdHeader.trim());
    }
}
