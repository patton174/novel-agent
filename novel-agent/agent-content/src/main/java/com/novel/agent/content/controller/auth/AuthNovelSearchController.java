package com.novel.agent.content.controller.auth;

import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.service.BaseController;
import com.novel.agent.content.dto.ChapterSearchHitDTO;
import com.novel.agent.content.service.auth.biz.AuthNovelSearchBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/content/auth/novels/{novelId}/search")
@RequiredArgsConstructor
public class AuthNovelSearchController extends BaseController {

    private final AuthNovelSearchBiz biz;

    @GetMapping
    public Result<List<ChapterSearchHitDTO>> search(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String novelId,
        @RequestParam(name = "q") String query,
        @RequestParam(name = "limit", defaultValue = "5") int limit
    ) {
        return biz.search(parseUserId(userId), novelId, query, limit);
    }
}
