package com.novel.agent.content.controller;

import com.novel.agent.content.dto.ChapterDTO;
import com.novel.agent.content.dto.ChapterSummaryDTO;
import com.novel.agent.content.dto.NovelDTO;
import com.novel.agent.content.dto.VolumeDTO;
import com.novel.agent.content.service.ChapterService;
import com.novel.agent.content.service.NovelService;
import com.novel.agent.content.service.VolumeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/content/novels/{novelId}/agent-context")
@RequiredArgsConstructor
public class NovelAgentContextController {

    private final NovelService novelService;
    private final ChapterService chapterService;
    private final VolumeService volumeService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> buildContext(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String novelId,
        @RequestParam(name = "chapterId", required = false) String chapterId
    ) {
        Long uid = Long.parseLong(userId.trim());
        NovelDTO novel = resolveNovel(uid, novelId);

        List<VolumeDTO> volumes = List.of();
        try {
            volumes = volumeService.listVolumes(uid, novelId);
        } catch (Exception ex) {
            log.warn("agent-context volumes skipped novelId={}: {}", novelId, ex.getMessage());
        }

        List<ChapterSummaryDTO> chapters = List.of();
        try {
            chapters = chapterService.listSummaries(uid, novelId);
        } catch (Exception ex) {
            log.warn("agent-context chapters skipped novelId={}: {}", novelId, ex.getMessage());
        }

        Map<String, Object> project = new HashMap<>();
        project.put("id", novel.id());
        project.put("title", novel.title());
        project.put("description", novel.description());
        project.put("genre", novel.genre());
        project.put("style", novel.style());
        project.put("target_chapter_words", novel.targetChapterWords());

        List<Map<String, Object>> volumeSummaries = volumes.stream().map(vol -> {
            Map<String, Object> item = new HashMap<>();
            item.put("id", vol.id());
            item.put("title", vol.title());
            item.put("description", vol.description());
            item.put("sort_order", vol.sortOrder());
            item.put("chapter_count", vol.chapterCount());
            return item;
        }).toList();

        List<Map<String, Object>> chapterSummaries = chapters.stream().map(ch -> {
            Map<String, Object> item = new HashMap<>();
            item.put("id", ch.id());
            item.put("volume_id", ch.volumeId());
            item.put("volume_title", ch.volumeTitle());
            item.put("title", ch.title());
            item.put("summary", ch.summary());
            item.put("sort_order", ch.sortOrder());
            item.put("word_count", ch.wordCount());
            return item;
        }).toList();

        Map<String, Object> chapter = Map.of();
        String text = "";
        if (chapterId != null && !chapterId.isBlank()) {
            try {
                ChapterDTO current = chapterService.getChapter(uid, chapterId);
                chapter = Map.of(
                    "id", current.id(),
                    "volume_id", current.volumeId() == null ? "" : current.volumeId(),
                    "title", current.title(),
                    "content", current.content() == null ? "" : current.content(),
                    "summary", current.summary() == null ? "" : current.summary(),
                    "word_count", current.wordCount()
                );
                text = current.content() == null ? "" : current.content();
            } catch (Exception ex) {
                log.warn("agent-context chapter skipped chapterId={}: {}", chapterId, ex.getMessage());
            }
        }

        Map<String, Object> body = new HashMap<>();
        body.put("project", project);
        body.put("volumes", volumeSummaries);
        body.put("chapters", chapterSummaries);
        body.put("chapter", chapter);
        body.put("text", text);
        return ResponseEntity.ok(body);
    }

    /** getNovel 在部分环境异常时，回退到 list 过滤（list 接口已验证可用）。 */
    private NovelDTO resolveNovel(Long userId, String novelId) {
        try {
            return novelService.getNovel(userId, novelId);
        } catch (Exception ex) {
            log.warn("getNovel failed novelId={}, fallback to list: {}", novelId, ex.getMessage());
        }
        return novelService.listNovels(userId).stream()
            .filter(item -> novelId.equals(item.id()))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "小说不存在"));
    }
}
