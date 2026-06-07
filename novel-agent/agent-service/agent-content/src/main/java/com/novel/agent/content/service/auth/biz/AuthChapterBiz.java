package com.novel.agent.content.service.auth.biz;

import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.content.dto.ChapterDTO;
import com.novel.agent.content.dto.ChapterReadSliceDTO;
import com.novel.agent.content.dto.ChapterVersionDTO;
import com.novel.agent.content.dto.UpdateChapterRequest;
import com.novel.agent.content.service.ChapterService;
import com.novel.agent.content.service.ChapterVersionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AuthChapterBiz extends BaseBiz {

    private final ChapterService chapterService;
    private final ChapterVersionService versionService;

    public Result<ChapterDTO> get(Long userId, String chapterId) {
        return ok(chapterService.getChapter(userId, chapterId));
    }

    public Result<ChapterReadSliceDTO> readSlice(Long userId, String chapterId, Integer offset, Integer limit) {
        return ok(chapterService.readChapterSlice(userId, chapterId, offset, limit));
    }

    public Result<ChapterDTO> update(Long userId, String chapterId, UpdateChapterRequest request, String editSource) {
        String source = editSource == null || editSource.isBlank() ? "user" : editSource.trim();
        return ok(chapterService.updateChapter(userId, chapterId, request, source));
    }

    public Result<Map<String, Object>> delete(Long userId, String chapterId) {
        chapterService.deleteChapter(userId, chapterId);
        return ok(Map.of("ok", true));
    }

    public Result<List<ChapterVersionDTO>> listVersions(Long userId, String chapterId, int limit) {
        return ok(versionService.listVersions(userId, chapterId, limit));
    }

    public Result<ChapterDTO> restoreVersion(Long userId, String chapterId, String versionId) {
        return ok(chapterService.restoreVersion(userId, chapterId, versionId));
    }
}
