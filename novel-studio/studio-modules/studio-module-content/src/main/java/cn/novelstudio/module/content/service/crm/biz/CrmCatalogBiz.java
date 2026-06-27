package cn.novelstudio.module.content.service.crm.biz;

import cn.novelstudio.kernel.base.Page;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.content.service.catalog.CatalogService;
import cn.novelstudio.module.content.service.crawl.dto.CatalogChapterDetailDTO;
import cn.novelstudio.module.content.service.crawl.dto.CatalogChapterSummaryDTO;
import cn.novelstudio.module.content.service.crawl.dto.CatalogNovelDTO;
import cn.novelstudio.module.content.service.crawl.dto.CatalogNovelProgressDTO;
import cn.novelstudio.module.content.service.crawl.dto.UpdateCatalogChapterRequest;
import cn.novelstudio.module.content.service.crawl.dto.UpdateCatalogNovelRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class CrmCatalogBiz extends BaseBiz {

    private final CatalogService catalogService;

    public Result<Page<CatalogNovelDTO>> pageNovels(int pageCurrent, int pageSize) {
        return ok(toPage(catalogService.pagePublicCatalog(pageCurrent, pageSize), pageCurrent, pageSize));
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

    public Result<List<CatalogNovelProgressDTO>> listMissingCover(int limit) {
        return ok(catalogService.listMissingCover(limit));
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
