package cn.novelstudio.module.content.service.auth.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.content.dto.ChapterDTO;
import cn.novelstudio.module.content.support.ContentExceptions;
import cn.novelstudio.module.content.dto.ChapterSummaryDTO;
import cn.novelstudio.module.content.dto.NovelDTO;
import cn.novelstudio.module.content.dto.VolumeDTO;
import cn.novelstudio.module.content.service.ChapterService;
import cn.novelstudio.module.content.service.MemoryNodeService;
import cn.novelstudio.module.content.service.NovelService;
import cn.novelstudio.module.content.service.VolumeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuthNovelAgentContextBiz extends BaseBiz {

    private final NovelService novelService;
    private final ChapterService chapterService;
    private final VolumeService volumeService;
    private final MemoryNodeService memoryNodeService;

    public Result<Map<String, Object>> buildContext(Long userId, String novelId, String chapterId) {
        NovelDTO novel = resolveNovel(userId, novelId);

        CompletableFuture<List<VolumeDTO>> volumesFuture = CompletableFuture.supplyAsync(
            () -> safeListVolumes(userId, novelId)
        );
        CompletableFuture<List<ChapterSummaryDTO>> chaptersFuture = CompletableFuture.supplyAsync(
            () -> safeListChapters(userId, novelId)
        );
        CompletableFuture<Map<String, Object>> memoryFuture = CompletableFuture.supplyAsync(
            () -> safeMemoryTreeIndex(userId, novelId)
        );
        CompletableFuture<ChapterSlice> chapterFuture = (chapterId != null && !chapterId.isBlank())
            ? CompletableFuture.supplyAsync(() -> safeLoadChapter(userId, chapterId))
            : CompletableFuture.completedFuture(new ChapterSlice(Map.of(), ""));

        CompletableFuture.allOf(volumesFuture, chaptersFuture, memoryFuture, chapterFuture).join();

        List<VolumeDTO> volumes = volumesFuture.join();
        List<ChapterSummaryDTO> chapters = chaptersFuture.join();
        Map<String, Object> memoryTreeIndex = memoryFuture.join();
        ChapterSlice chapterSlice = chapterFuture.join();

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
            item.put("list_index", ch.listIndex());
            item.put("word_count", ch.wordCount());
            return item;
        }).toList();

        Map<String, Object> body = new HashMap<>();
        body.put("project", project);
        body.put("volumes", volumeSummaries);
        body.put("chapters", chapterSummaries);
        body.put("chapter", chapterSlice.chapter());
        body.put("text", chapterSlice.text());
        if (memoryTreeIndex != null && !memoryTreeIndex.isEmpty()) {
            body.put("memory_tree_index", memoryTreeIndex);
        }
        return ok(body);
    }

    private Map<String, Object> safeMemoryTreeIndex(Long userId, String novelId) {
        try {
            return memoryNodeService.buildAllScopesTreeIndex(userId, novelId);
        } catch (Exception ex) {
            log.warn("agent-context memory_tree_index skipped novelId={}: {}", novelId, ex.getMessage());
            return Map.of();
        }
    }

    private List<VolumeDTO> safeListVolumes(Long userId, String novelId) {
        try {
            return volumeService.listVolumes(userId, novelId);
        } catch (Exception ex) {
            log.warn("agent-context volumes skipped novelId={}: {}", novelId, ex.getMessage());
            return List.of();
        }
    }

    private List<ChapterSummaryDTO> safeListChapters(Long userId, String novelId) {
        try {
            return chapterService.listSummaries(userId, novelId);
        } catch (Exception ex) {
            log.warn("agent-context chapters skipped novelId={}: {}", novelId, ex.getMessage());
            return List.of();
        }
    }

    private ChapterSlice safeLoadChapter(Long userId, String chapterId) {
        try {
            ChapterDTO current = chapterService.getChapter(userId, chapterId);
            Map<String, Object> chapter = Map.of(
                "id", current.id(),
                "volume_id", current.volumeId() == null ? "" : current.volumeId(),
                "title", current.title(),
                "content", current.content() == null ? "" : current.content(),
                "summary", current.summary() == null ? "" : current.summary(),
                "word_count", current.wordCount()
            );
            String text = current.content() == null ? "" : current.content();
            return new ChapterSlice(chapter, text);
        } catch (Exception ex) {
            log.warn("agent-context chapter skipped chapterId={}: {}", chapterId, ex.getMessage());
            return new ChapterSlice(Map.of(), "");
        }
    }

    private NovelDTO resolveNovel(Long userId, String novelId) {
        try {
            return novelService.getNovel(userId, novelId);
        } catch (Exception ex) {
            log.warn("getNovel failed novelId={}, fallback to list: {}", novelId, ex.getMessage());
        }
        return novelService.listNovels(userId).stream()
            .filter(item -> novelId.equals(item.id()))
            .findFirst()
            .orElseThrow(ContentExceptions::novelNotFound);
    }

    private record ChapterSlice(Map<String, Object> chapter, String text) {}
}
