package com.novel.agent.content.service.auth.biz;

import com.novel.agent.common.core.base.Page;
import com.novel.agent.common.core.base.PageQuery;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.common.service.utils.SpringPageSupport;
import com.novel.agent.content.dto.NovelDTO;
import com.novel.agent.content.service.catalog.CatalogService;
import com.novel.agent.content.service.crawl.dto.CatalogChapterSummaryDTO;
import com.novel.agent.content.service.crawl.dto.CatalogNovelDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class AuthCatalogBiz extends BaseBiz {

    private final CatalogService catalogService;

    public Result<Page<CatalogNovelDTO>> page(int pageCurrent, int pageSize) {
        PageQuery query = pageQuery(pageCurrent, pageSize);
        org.springframework.data.domain.Page<CatalogNovelDTO> page = catalogService.pageCatalog(
            query.pageCurrent(),
            query.pageSize()
        );
        return ok(SpringPageSupport.map(page, item -> item, query.pageCurrent(), query.pageSize()));
    }

    public Result<CatalogNovelDTO> get(String catalogNovelId) {
        return ok(catalogService.getCatalog(catalogNovelId));
    }

    public Result<List<CatalogChapterSummaryDTO>> listChapters(String catalogNovelId) {
        return ok(catalogService.listChapters(catalogNovelId));
    }

    public Result<NovelDTO> addToLibrary(Long userId, String catalogNovelId) {
        return ok(catalogService.addToUserLibrary(userId, catalogNovelId));
    }
}
