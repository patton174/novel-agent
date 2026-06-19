package com.novel.agent.content.service.crm.biz;

import com.novel.agent.common.core.base.Page;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.content.service.catalog.CatalogService;
import com.novel.agent.content.service.crawl.dto.CatalogChapterDetailDTO;
import com.novel.agent.content.service.crawl.dto.CatalogChapterSummaryDTO;
import com.novel.agent.content.service.crawl.dto.CatalogNovelDTO;
import com.novel.agent.content.service.crawl.dto.CatalogNovelProgressDTO;
import com.novel.agent.content.service.crawl.dto.UpdateCatalogChapterRequest;
import com.novel.agent.content.service.crawl.dto.UpdateCatalogNovelRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class CrmCatalogBiz extends BaseBiz {

    private final CatalogService catalogService;

    public Result<Page<CatalogNovelDTO>> pageNovels(int pageCurrent, int pageSize) {
        return ok(toPage(catalogService.pageCatalog(pageCurrent, pageSize), pageCurrent, pageSize));
    }

    public Result<CatalogNovelDTO> getNovel(String catalogNovelId) {
        return ok(catalogService.getCatalog(catalogNovelId));
    }

    public Result<CatalogNovelProgressDTO> getProgress(String catalogNovelId) {
        return ok(catalogService.getCatalogProgress(catalogNovelId));
    }

    public Result<List<CatalogChapterSummaryDTO>> listChapters(String catalogNovelId) {
        return ok(catalogService.listChapters(catalogNovelId));
    }

    public Result<CatalogChapterDetailDTO> getChapter(String catalogNovelId, String chapterId) {
        return ok(catalogService.getChapter(catalogNovelId, chapterId));
    }

    public Result<CatalogChapterDetailDTO> updateChapter(
        String catalogNovelId,
        String chapterId,
        UpdateCatalogChapterRequest request
    ) {
        return ok(catalogService.updateChapter(catalogNovelId, chapterId, request));
    }

    public Result<Void> deleteChapter(String catalogNovelId, String chapterId) {
        catalogService.deleteChapter(catalogNovelId, chapterId);
        return ok(null);
    }

    public Result<List<CatalogNovelProgressDTO>> listIncomplete(int limit) {
        return ok(catalogService.listIncomplete(limit));
    }

    public Result<CatalogNovelDTO> updateNovel(String catalogNovelId, UpdateCatalogNovelRequest request) {
        return ok(catalogService.updateCatalog(catalogNovelId, request));
    }

    public Result<CatalogNovelDTO> setCover(String catalogNovelId, Map<String, String> body) {
        return ok(catalogService.setCoverUrl(catalogNovelId, body.get("coverUrl")));
    }

    public Result<Void> deleteNovel(String catalogNovelId) {
        catalogService.deleteCatalog(catalogNovelId);
        return ok(null);
    }

    private <T> Page<T> toPage(org.springframework.data.domain.Page<T> springPage, int pageCurrent, int pageSize) {
        return Page.of(springPage.getContent(), springPage.getTotalElements(), pageCurrent, pageSize);
    }
}
