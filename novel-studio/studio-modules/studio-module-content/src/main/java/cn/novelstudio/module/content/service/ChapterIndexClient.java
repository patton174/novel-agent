package cn.novelstudio.module.content.service;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.module.content.dto.ChapterDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Async;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ChapterIndexClient {

    private static final Logger log = LoggerFactory.getLogger(ChapterIndexClient.class);

    private final RestClient restClient;
    private final ReindexJobService reindexJobService;

    public ChapterIndexClient(
        @Qualifier("pythonRestClient") RestClient restClient,
        ReindexJobService reindexJobService
    ) {
        this.restClient = restClient;
        this.reindexJobService = reindexJobService;
    }

    @Async
    public void indexChapter(String novelId, ChapterDTO chapter) {
        indexChapterSync(novelId, chapter);
    }

    @Async
    public void removeChapter(String chapterId) {
        if (chapterId == null || chapterId.isBlank()) {
            return;
        }
        try {
            restClient.delete()
                .uri("/api/rag/index/chapter/{chapterId}", chapterId)
                .retrieve()
                .toBodilessEntity();
        } catch (Exception ex) {
            log.debug("chapter index remove skipped: {}", ex.getMessage());
        }
    }

    public void clearNovelIndex(String novelId) {
        if (novelId == null || novelId.isBlank()) {
            return;
        }
        try {
            restClient.delete()
                .uri("/api/rag/index/novel/{novelId}", novelId)
                .retrieve()
                .toBodilessEntity();
        } catch (Exception ex) {
            throw BizException.keyed(ResultCode.ERROR, "content.index.clear_failed", ex.getMessage());
        }
    }

    public void indexChapterSync(String novelId, ChapterDTO chapter) {
        if (novelId == null || novelId.isBlank() || chapter == null) {
            return;
        }
        if (chapter.content() == null || chapter.content().isBlank()) {
            return;
        }
        String chapterId = chapter.id();
        String title = chapter.title();
        if (chapterId == null || chapterId.isBlank()) {
            log.warn("chapter index skipped: blank chapter_id novelId={}", novelId);
            return;
        }
        if (title == null || title.isBlank()) {
            log.warn("chapter index skipped: blank title chapterId={} novelId={}", chapterId, novelId);
            return;
        }
        Map<String, Object> body = new HashMap<>();
        body.put("novel_id", novelId.trim());
        body.put("chapter_id", chapterId.trim());
        body.put("title", title.trim());
        body.put("content", chapter.content());
        body.put("summary", chapter.summary());
        try {
            restClient.post()
                .uri("/api/rag/index/chapter")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .toBodilessEntity();
        } catch (Exception ex) {
            log.warn(
                "chapter index failed novelId={} chapterId={} title={}: {}",
                novelId,
                chapterId,
                title,
                ex.getMessage()
            );
        }
    }

    @Async
    public void reindexNovelAsync(String novelId, List<ChapterDTO> chapters) {
        int indexed = 0;
        try {
            clearNovelIndex(novelId);
            int processed = 0;
            for (ChapterDTO chapter : chapters) {
                processed++;
                if (chapter.content() != null && !chapter.content().isBlank()) {
                    indexChapterSync(novelId, chapter);
                    indexed++;
                }
                reindexJobService.updateProgress(novelId, processed, indexed);
            }
            reindexJobService.complete(novelId, indexed);
        } catch (Exception ex) {
            log.warn("novel reindex failed: {}", ex.getMessage());
            reindexJobService.fail(novelId, ex.getMessage());
        }
    }
}
