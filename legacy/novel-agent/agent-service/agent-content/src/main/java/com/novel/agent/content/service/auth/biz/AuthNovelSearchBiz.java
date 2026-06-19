package com.novel.agent.content.service.auth.biz;

import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.content.dto.ChapterSearchHitDTO;
import com.novel.agent.content.service.ChapterService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class AuthNovelSearchBiz extends BaseBiz {

    private final ChapterService chapterService;

    public Result<List<ChapterSearchHitDTO>> search(Long userId, String novelId, String query, int limit) {
        return ok(chapterService.searchChapters(userId, novelId, query, limit));
    }
}
