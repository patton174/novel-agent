package cn.novelstudio.module.content.controller.internal;

import cn.novelstudio.module.content.service.catalog.CatalogService;
import cn.novelstudio.module.content.service.crawl.CrawlOrchestratorStateService;
import cn.novelstudio.module.content.service.crawl.dto.CatalogOverviewDTO;
import cn.novelstudio.module.content.service.crawl.dto.CrawlOrchestratorStateDTO;
import cn.novelstudio.module.content.service.crawl.dto.CatalogNovelProgressDTO;
import cn.novelstudio.module.content.service.crawl.dto.CrawlJobDTO;
import cn.novelstudio.module.content.service.crawl.dto.InternalCreateCrawlJobRequest;
import cn.novelstudio.module.content.service.crawl.dto.SetOrchestratorGoalRequest;
import cn.novelstudio.module.content.entity.CrawlJobEntity;
import cn.novelstudio.module.content.service.crawl.CrawlJobService;
import cn.novelstudio.module.content.service.crawl.PythonCrawlClient;
import cn.novelstudio.module.content.service.internal.InternalCrawlBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/internal/crawl")
@RequiredArgsConstructor
public class InternalCrawlOrchestratorController {

    private final CrawlOrchestratorStateService orchestratorStateService;
    private final CatalogService catalogService;
    private final InternalCrawlBiz crawlBiz;
    private final CrawlJobService crawlJobService;

    @GetMapping("/orchestrator/jobs")
    public cn.novelstudio.kernel.base.Page<CrawlJobDTO> pageJobs(
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        var page = crawlJobService.pageJobs(pageCurrent, pageSize);
        return cn.novelstudio.kernel.base.Page.of(
            page.getContent().stream().map(PythonCrawlClient::toDto).toList(),
            page.getTotalElements(),
            pageCurrent,
            pageSize
        );
    }

    @PostMapping("/orchestrator/jobs")
    public CrawlJobDTO createAndStart(@RequestBody InternalCreateCrawlJobRequest request) {
        if (crawlBiz.runningJobCount() >= CrawlOrchestratorStateService.MAX_CONCURRENT_JOBS) {
            throw new cn.novelstudio.kernel.exception.ValidationException(
                cn.novelstudio.kernel.enums.ResultCode.BAD_REQUEST,
                "并发子任务已达上限 "
                    + CrawlOrchestratorStateService.MAX_CONCURRENT_JOBS
                    + "（含 RUNNING 与 PAUSED）"
            );
        }
        CrawlJobEntity entity = crawlJobService.createJob(
            request.sourceUrl(),
            null,
            null,
            request.configJson()
        );
        if (request.catalogNovelId() != null && !request.catalogNovelId().isBlank()) {
            entity.setCatalogNovelId(request.catalogNovelId().trim());
            crawlJobService.saveJob(entity);
        }
        return PythonCrawlClient.toDto(crawlJobService.startJob(entity.getId()));
    }

    @GetMapping("/orchestrator")
    public CrawlOrchestratorStateDTO getState() {
        return orchestratorStateService.getState();
    }

    @PutMapping("/orchestrator/goal")
    public CrawlOrchestratorStateDTO setGoal(@RequestBody SetOrchestratorGoalRequest request) {
        return orchestratorStateService.setGoal(request.goal());
    }

    @PostMapping("/orchestrator/decision")
    public Map<String, Object> recordDecision(@RequestBody Map<String, String> body) {
        orchestratorStateService.recordDecision(body.get("decision"));
        return Map.of("ok", true);
    }

    @PostMapping("/orchestrator/sleep")
    public CrawlOrchestratorStateDTO sleep() {
        orchestratorStateService.markSleeping();
        return orchestratorStateService.getState();
    }

    @PostMapping("/orchestrator/complete")
    public CrawlOrchestratorStateDTO complete() {
        return orchestratorStateService.clearGoal();
    }

    @GetMapping("/catalog/incomplete")
    public List<CatalogNovelProgressDTO> listIncomplete(@RequestParam(defaultValue = "50") int limit) {
        return catalogService.listIncomplete(limit);
    }

    @GetMapping("/catalog/missing-cover")
    public List<CatalogNovelProgressDTO> listMissingCover(@RequestParam(defaultValue = "50") int limit) {
        return catalogService.listMissingCover(limit);
    }

    @GetMapping("/catalog/overview")
    public CatalogOverviewDTO catalogOverview(
        @RequestParam(defaultValue = "30") int limit
    ) {
        return catalogService.buildOrchestratorOverview(limit);
    }

    @GetMapping("/jobs/running-count")
    public Map<String, Integer> runningCount() {
        return Map.of(
            "running", (int) crawlBiz.runningJobCount(),
            "max", CrawlOrchestratorStateService.MAX_CONCURRENT_JOBS
        );
    }
}
