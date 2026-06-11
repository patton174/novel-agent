package cn.novelstudio.module.content.service.auth.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.content.dto.ChapterSearchHitDTO;
import cn.novelstudio.module.content.service.ChapterService;
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
