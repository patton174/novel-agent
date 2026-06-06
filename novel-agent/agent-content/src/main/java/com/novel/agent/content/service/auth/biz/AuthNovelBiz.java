package com.novel.agent.content.service.auth.biz;

import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.content.dto.ChapterDTO;
import com.novel.agent.content.dto.ChapterSummaryDTO;
import com.novel.agent.content.dto.CoverPromptResponse;
import com.novel.agent.content.dto.CreateNovelRequest;
import com.novel.agent.content.dto.NovelDTO;
import com.novel.agent.content.dto.ReindexStatusDTO;
import com.novel.agent.content.dto.SessionDTO;
import com.novel.agent.content.dto.UpdateNovelRequest;
import com.novel.agent.content.service.ChapterService;
import com.novel.agent.content.service.ContentSessionService;
import com.novel.agent.content.service.NovelCoverService;
import com.novel.agent.content.service.NovelService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AuthNovelBiz extends BaseBiz {

    private final NovelService novelService;
    private final NovelCoverService novelCoverService;
    private final ChapterService chapterService;
    private final ContentSessionService sessionService;

    public Result<List<NovelDTO>> list(Long userId) {
        return ok(novelService.listNovels(userId));
    }

    public Result<NovelDTO> create(Long userId, CreateNovelRequest request) {
        return ok(novelService.createNovel(userId, request));
    }

    public Result<NovelDTO> get(Long userId, String novelId) {
        return ok(novelService.getNovel(userId, novelId));
    }

    public Result<NovelDTO> update(Long userId, String novelId, UpdateNovelRequest request) {
        return ok(novelService.updateNovel(userId, novelId, request));
    }

    public Result<NovelDTO> generateCover(Long userId, String novelId, String prompt) {
        return ok(novelCoverService.generateCover(userId, novelId, prompt));
    }

    public Result<CoverPromptResponse> suggestCoverPrompt(Long userId, String novelId, String draft) {
        return ok(novelCoverService.suggestCoverPrompt(userId, novelId, draft));
    }

    public Result<Map<String, Object>> delete(Long userId, String novelId) {
        novelService.deleteNovel(userId, novelId);
        return ok(Map.of("ok", true));
    }

    public Result<List<ChapterSummaryDTO>> listChapters(Long userId, String novelId) {
        return ok(chapterService.listSummaries(userId, novelId));
    }

    public Result<ChapterDTO> createChapter(Long userId, String novelId, CreateChapterRequest request) {
        return ok(chapterService.createChapter(userId, novelId, request));
    }

    public Result<List<ChapterSummaryDTO>> reorderChapters(Long userId, String novelId, List<String> ids) {
        return ok(chapterService.reorderNovelChapters(userId, novelId, ids));
    }

    public Result<ReindexStatusDTO> reindex(Long userId, String novelId) {
        return ok(chapterService.reindexNovel(userId, novelId));
    }

    public Result<ReindexStatusDTO> reindexStatus(Long userId, String novelId) {
        return ok(chapterService.getReindexStatus(userId, novelId));
    }

    public Result<List<SessionDTO>> listSessions(String userId, String novelId, int limit) {
        return ok(sessionService.listSessionsByNovel(userId, novelId, limit));
    }
}
