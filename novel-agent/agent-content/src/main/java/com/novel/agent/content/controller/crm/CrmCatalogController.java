package com.novel.agent.content.controller.crm;

import com.novel.agent.common.core.base.Page;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.service.BaseController;
import com.novel.agent.content.service.crawl.dto.CatalogChapterDetailDTO;
import com.novel.agent.content.service.crawl.dto.CatalogChapterSummaryDTO;
import com.novel.agent.content.service.crawl.dto.CatalogNovelDTO;
import com.novel.agent.content.service.crawl.dto.CatalogNovelProgressDTO;
import com.novel.agent.content.service.crawl.dto.CrawlOrchestratorStateDTO;
import com.novel.agent.content.service.crawl.dto.SetOrchestratorGoalRequest;
import com.novel.agent.content.service.crawl.dto.UpdateCatalogChapterRequest;
import com.novel.agent.content.service.crawl.dto.UpdateCatalogNovelRequest;
import com.novel.agent.content.service.crm.biz.CrmCatalogBiz;
import com.novel.agent.content.service.crm.biz.CrmCrawlBiz;
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
@RequiredArgsConstructor
public class CrmCatalogController extends BaseController {

    private final CrmCatalogBiz catalogBiz;
    private final CrmCrawlBiz crawlBiz;

    @GetMapping("/api/content/crm/catalog/novels/page")
    public Result<Page<CatalogNovelDTO>> pageNovels(
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return catalogBiz.pageNovels(pageCurrent, pageSize);
    }

    @GetMapping("/api/content/crm/catalog/novels/incomplete")
    public Result<List<CatalogNovelProgressDTO>> listIncomplete(
        @RequestParam(defaultValue = "50") int limit
    ) {
        return catalogBiz.listIncomplete(limit);
    }

    @GetMapping("/api/content/crm/catalog/novels/{catalogNovelId}")
    public Result<CatalogNovelDTO> getNovel(@PathVariable String catalogNovelId) {
        return catalogBiz.getNovel(catalogNovelId);
    }

    @GetMapping("/api/content/crm/catalog/novels/{catalogNovelId}/progress")
    public Result<CatalogNovelProgressDTO> getProgress(@PathVariable String catalogNovelId) {
        return catalogBiz.getProgress(catalogNovelId);
    }

    @GetMapping("/api/content/crm/catalog/novels/{catalogNovelId}/chapters")
    public Result<List<CatalogChapterSummaryDTO>> listChapters(@PathVariable String catalogNovelId) {
        return catalogBiz.listChapters(catalogNovelId);
    }

    @GetMapping("/api/content/crm/catalog/novels/{catalogNovelId}/chapters/{chapterId}")
    public Result<CatalogChapterDetailDTO> getChapter(
        @PathVariable String catalogNovelId,
        @PathVariable String chapterId
    ) {
        return catalogBiz.getChapter(catalogNovelId, chapterId);
    }

    @PutMapping("/api/content/crm/catalog/novels/{catalogNovelId}/chapters/{chapterId}")
    public Result<CatalogChapterDetailDTO> updateChapter(
        @PathVariable String catalogNovelId,
        @PathVariable String chapterId,
        @RequestBody UpdateCatalogChapterRequest request
    ) {
        return catalogBiz.updateChapter(catalogNovelId, chapterId, request);
    }

    @DeleteMapping("/api/content/crm/catalog/novels/{catalogNovelId}/chapters/{chapterId}")
    public Result<Void> deleteChapter(
        @PathVariable String catalogNovelId,
        @PathVariable String chapterId
    ) {
        return catalogBiz.deleteChapter(catalogNovelId, chapterId);
    }

    @PutMapping("/api/content/crm/catalog/novels/{catalogNovelId}")
    public Result<CatalogNovelDTO> updateNovel(
        @PathVariable String catalogNovelId,
        @RequestBody UpdateCatalogNovelRequest request
    ) {
        return catalogBiz.updateNovel(catalogNovelId, request);
    }

    @PutMapping("/api/content/crm/catalog/novels/{catalogNovelId}/cover")
    public Result<CatalogNovelDTO> setCover(
        @PathVariable String catalogNovelId,
        @RequestBody Map<String, String> body
    ) {
        return catalogBiz.setCover(catalogNovelId, body);
    }

    @DeleteMapping("/api/content/crm/catalog/novels/{catalogNovelId}")
    public Result<Void> deleteNovel(@PathVariable String catalogNovelId) {
        return catalogBiz.deleteNovel(catalogNovelId);
    }

    @GetMapping("/api/content/crm/crawl/orchestrator")
    public Result<CrawlOrchestratorStateDTO> getOrchestrator() {
        return crawlBiz.getOrchestratorState();
    }

    @PutMapping("/api/content/crm/crawl/orchestrator/goal")
    public Result<CrawlOrchestratorStateDTO> setOrchestratorGoal(
        @Valid @RequestBody SetOrchestratorGoalRequest request
    ) {
        return crawlBiz.setOrchestratorGoal(request);
    }

    @PostMapping("/api/content/crm/crawl/orchestrator/wake")
    public Result<CrawlOrchestratorStateDTO> wakeOrchestrator() {
        return crawlBiz.wakeOrchestrator();
    }

    @PostMapping("/api/content/crm/crawl/orchestrator/clear")
    public Result<CrawlOrchestratorStateDTO> clearOrchestratorGoal() {
        return crawlBiz.clearOrchestratorGoal();
    }
}
