package cn.novelstudio.module.content.service.auth.biz;

import cn.novelstudio.kernel.base.Page;
import cn.novelstudio.kernel.base.PageQuery;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.platform.web.utils.SpringPageSupport;
import cn.novelstudio.module.content.dto.NovelDTO;
import cn.novelstudio.module.content.service.catalog.CatalogService;
import cn.novelstudio.module.content.service.crawl.dto.CatalogChapterSummaryDTO;
import cn.novelstudio.module.content.service.crawl.dto.CatalogNovelDTO;
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

    public Result<Page<CatalogNovelDTO>> myLibrary(Long userId, int pageCurrent, int pageSize) {
        PageQuery query = pageQuery(pageCurrent, pageSize);
        org.springframework.data.domain.Page<CatalogNovelDTO> page = catalogService.listMyLibrary(
            userId,
            query.pageCurrent(),
            query.pageSize()
        );
        return ok(SpringPageSupport.map(page, item -> item, query.pageCurrent(), query.pageSize()));
    }

    public Result<Void> collect(Long userId, String catalogNovelId) {
        catalogService.collect(userId, catalogNovelId);
        return ok();
    }
}
