package com.novel.agent.content.controller.auth;

import com.novel.agent.common.core.base.Page;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.service.BaseController;
import com.novel.agent.content.dto.NovelDTO;
import com.novel.agent.content.service.auth.biz.AuthCatalogBiz;
import com.novel.agent.content.service.crawl.dto.CatalogChapterSummaryDTO;
import com.novel.agent.content.service.crawl.dto.CatalogNovelDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/content/auth/catalog")
@RequiredArgsConstructor
public class AuthCatalogController extends BaseController {

    private final AuthCatalogBiz biz;

    @GetMapping("/novels")
    public Result<Page<CatalogNovelDTO>> page(
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return biz.page(pageCurrent, pageSize);
    }

    @GetMapping("/novels/{catalogNovelId}")
    public Result<CatalogNovelDTO> get(@PathVariable String catalogNovelId) {
        return biz.get(catalogNovelId);
    }

    @GetMapping("/novels/{catalogNovelId}/chapters")
    public Result<List<CatalogChapterSummaryDTO>> listChapters(@PathVariable String catalogNovelId) {
        return biz.listChapters(catalogNovelId);
    }

    @PostMapping("/novels/{catalogNovelId}/add")
    public Result<NovelDTO> addToLibrary(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String catalogNovelId
    ) {
        return biz.addToLibrary(parseUserId(userId), catalogNovelId);
    }
}
