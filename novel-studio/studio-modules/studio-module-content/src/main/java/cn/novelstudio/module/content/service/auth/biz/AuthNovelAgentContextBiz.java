package cn.novelstudio.module.content.service.auth.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.module.content.dto.ChapterDTO;
import cn.novelstudio.module.content.support.ContentExceptions;
import cn.novelstudio.module.content.dto.ChapterSummaryDTO;
import cn.novelstudio.module.content.dto.NovelDTO;
import cn.novelstudio.module.content.dto.VolumeDTO;
import cn.novelstudio.module.content.service.ChapterService;
import cn.novelstudio.module.content.service.NovelService;
import cn.novelstudio.module.content.service.VolumeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuthNovelAgentContextBiz extends BaseBiz {

    private final NovelService novelService;
    private final ChapterService chapterService;
    private final VolumeService volumeService;

    public Result<Map<String, Object>> buildContext(Long userId, String novelId, String chapterId) {
        NovelDTO novel = resolveNovel(userId, novelId);

        List<VolumeDTO> volumes = safeListVolumes(userId, novelId);
        List<ChapterSummaryDTO> chapters = safeListChapters(userId, novelId);

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
            ChapterSlice slice = safeLoadChapter(userId, chapterId);
            chapter = slice.chapter();
            text = slice.text();
        }

        Map<String, Object> body = new HashMap<>();
        body.put("project", project);
        body.put("volumes", volumeSummaries);
        body.put("chapters", chapterSummaries);
        body.put("chapter", chapter);
        body.put("text", text);
        return ok(body);
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
