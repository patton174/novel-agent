package com.novel.agent.content.controller.internal;

import com.novel.agent.common.core.base.Page;
import com.novel.agent.content.service.catalog.CatalogService;
import com.novel.agent.content.service.crawl.dto.AddCatalogChapterRequest;
import com.novel.agent.content.service.crawl.dto.CatalogChapterDetailDTO;
import com.novel.agent.content.service.crawl.dto.CatalogChapterSummaryDTO;
import com.novel.agent.content.service.crawl.dto.CatalogNovelDTO;
import com.novel.agent.content.service.crawl.dto.CatalogNovelProgressDTO;
import com.novel.agent.content.service.crawl.dto.SetCatalogCoverRequest;
import com.novel.agent.content.service.crawl.dto.UpdateCatalogChapterRequest;
import com.novel.agent.content.service.crawl.dto.UpdateCatalogNovelRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/internal/crawl/catalog")
@RequiredArgsConstructor
public class InternalCatalogController {

    private final CatalogService catalogService;

    @GetMapping("/novels")
    public Page<CatalogNovelDTO> pageNovels(
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        var page = catalogService.pageCatalog(pageCurrent, pageSize);
        return Page.of(page.getContent(), page.getTotalElements(), pageCurrent, pageSize);
    }

    @GetMapping("/novels/{catalogNovelId}")
    public CatalogNovelDTO getNovel(@PathVariable String catalogNovelId) {
        return catalogService.getCatalog(catalogNovelId);
    }

    @GetMapping("/novels/{catalogNovelId}/progress")
    public CatalogNovelProgressDTO getProgress(@PathVariable String catalogNovelId) {
        return catalogService.getCatalogProgress(catalogNovelId);
    }

    @PutMapping("/novels/{catalogNovelId}")
    public CatalogNovelDTO updateNovel(
        @PathVariable String catalogNovelId,
        @RequestBody UpdateCatalogNovelRequest request
    ) {
        return catalogService.updateCatalog(catalogNovelId, request);
    }

    @DeleteMapping("/novels/{catalogNovelId}")
    public Map<String, Object> deleteNovel(@PathVariable String catalogNovelId) {
        catalogService.deleteCatalog(catalogNovelId);
        return Map.of("ok", true, "deletedId", catalogNovelId);
    }

    @PostMapping("/novels/{catalogNovelId}/cover")
    public CatalogNovelDTO setCover(
        @PathVariable String catalogNovelId,
        @Valid @RequestBody SetCatalogCoverRequest request
    ) {
        return catalogService.setCoverUrl(catalogNovelId, request.coverUrl());
    }

    @GetMapping("/novels/{catalogNovelId}/chapters")
    public List<CatalogChapterSummaryDTO> listChapters(@PathVariable String catalogNovelId) {
        return catalogService.listChapters(catalogNovelId);
    }

    @GetMapping("/novels/{catalogNovelId}/chapters/{chapterId}")
    public CatalogChapterDetailDTO getChapter(
        @PathVariable String catalogNovelId,
        @PathVariable String chapterId
    ) {
        return catalogService.getChapter(catalogNovelId, chapterId);
    }

    @PostMapping("/novels/{catalogNovelId}/chapters")
    public CatalogChapterDetailDTO addChapter(
        @PathVariable String catalogNovelId,
        @Valid @RequestBody AddCatalogChapterRequest request
    ) {
        var saved = catalogService.addChapter(
            catalogNovelId,
            request.title(),
            request.content(),
            request.sortOrder(),
            request.sourceUrl()
        );
        return catalogService.getChapter(catalogNovelId, saved.getId());
    }

    @PutMapping("/novels/{catalogNovelId}/chapters/{chapterId}")
    public CatalogChapterDetailDTO updateChapter(
        @PathVariable String catalogNovelId,
        @PathVariable String chapterId,
        @RequestBody UpdateCatalogChapterRequest request
    ) {
        return catalogService.updateChapter(catalogNovelId, chapterId, request);
    }

    @DeleteMapping("/novels/{catalogNovelId}/chapters/{chapterId}")
    public Map<String, Object> deleteChapter(
        @PathVariable String catalogNovelId,
        @PathVariable String chapterId
    ) {
        catalogService.deleteChapter(catalogNovelId, chapterId);
        return Map.of("ok", true, "deletedId", chapterId);
    }
}
