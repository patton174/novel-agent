package cn.novelstudio.module.content.service.crm.biz;

import cn.novelstudio.kernel.base.Page;
import cn.novelstudio.kernel.base.PageQuery;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.platform.web.utils.SpringPageSupport;
import cn.novelstudio.module.content.entity.CrawlJobEntity;
import cn.novelstudio.module.content.entity.CrawlSiteEntity;
import cn.novelstudio.module.content.repository.CrawlJobRepository;
import cn.novelstudio.module.content.service.crawl.CrawlJobLogService;
import cn.novelstudio.module.content.service.crawl.CrawlJobService;
import cn.novelstudio.module.content.service.crawl.CrawlOrchestratorStateService;
import cn.novelstudio.module.content.service.crawl.PythonCrawlClient;
import cn.novelstudio.module.content.service.crawl.dto.CreateCrawlJobRequest;
import cn.novelstudio.module.content.service.crawl.dto.CrawlJobDTO;
import cn.novelstudio.module.content.service.crawl.dto.CrawlLogsResponse;
import cn.novelstudio.module.content.service.crawl.dto.CrawlOrchestratorStateDTO;
import cn.novelstudio.module.content.service.crawl.dto.OrchestratorDecisionsDTO;
import cn.novelstudio.module.content.service.crawl.dto.CrawlPreviewRequest;
import cn.novelstudio.module.content.service.crawl.dto.CrawlSiteDTO;
import cn.novelstudio.module.content.service.crawl.dto.SetOrchestratorGoalRequest;
import cn.novelstudio.module.content.service.crawl.dto.UpsertCrawlSiteRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class CrmCrawlBiz extends BaseBiz {

    private final CrawlJobService crawlJobService;
    private final CrawlJobRepository crawlJobRepository;
    private final PythonCrawlClient pythonCrawlClient;
    private final CrawlJobLogService crawlJobLogService;
    private final CrawlOrchestratorStateService orchestratorStateService;

    public Result<Page<CrawlJobDTO>> pageJobs(int pageCurrent, int pageSize) {
        PageQuery query = pageQuery(pageCurrent, pageSize);
        org.springframework.data.domain.Page<CrawlJobEntity> page = crawlJobRepository.findAllByOrderByUpdatedAtDesc(
            PageRequest.of(Math.max(0, query.pageCurrent() - 1), query.pageSize())
        );
        return ok(SpringPageSupport.map(page, PythonCrawlClient::toDto, query.pageCurrent(), query.pageSize()));
    }

    public Result<CrawlJobDTO> getJob(String jobId) {
        return ok(PythonCrawlClient.toDto(crawlJobService.getJob(jobId)));
    }

    public Result<CrawlJobDTO> createJob(Long adminUserId, CreateCrawlJobRequest request) {
        CrawlJobEntity saved = crawlJobService.createJob(
            request.sourceUrl(),
            adminUserId,
            request.siteId(),
            request.configJson()
        );
        return ok(PythonCrawlClient.toDto(saved));
    }

    public Result<CrawlJobDTO> startJob(String jobId) {
        return ok(PythonCrawlClient.toDto(crawlJobService.startJob(jobId)));
    }

    public Result<CrawlJobDTO> pauseJob(String jobId) {
        return ok(PythonCrawlClient.toDto(crawlJobService.pauseJob(jobId)));
    }

    public Result<CrawlJobDTO> cancelJob(String jobId) {
        return ok(PythonCrawlClient.toDto(crawlJobService.cancelJob(jobId)));
    }

    public Result<Void> deleteJob(String jobId) {
        crawlJobService.deleteJob(jobId);
        return ok(null);
    }

    public Result<CrawlLogsResponse> listLogs(String jobId, long afterSeq) {
        crawlJobService.getJob(jobId);
        return ok(crawlJobLogService.listAfter(jobId, Math.max(0L, afterSeq)));
    }

    public Result<Map<String, Object>> preview(CrawlPreviewRequest request) {
        try {
            Map<String, Object> config = crawlJobService.parseConfigJson(request.configJson());
            if ((config == null || config.isEmpty()) && request.siteId() != null && !request.siteId().isBlank()) {
                config = crawlJobService.parseConfigJson(crawlJobService.getSite(request.siteId()).getConfigJson());
            }
            return ok(pythonCrawlClient.preview(request.sourceUrl(), config));
        } catch (Exception ex) {
            return ok(Map.of("ok", false, "message", ex.getMessage() == null ? "预览失败" : ex.getMessage()));
        }
    }

    public Result<List<CrawlSiteDTO>> listSites() {
        return ok(crawlJobService.listAllSites().stream().map(PythonCrawlClient::toDto).toList());
    }

    public Result<CrawlSiteDTO> createSite(UpsertCrawlSiteRequest request) {
        CrawlSiteEntity entity = new CrawlSiteEntity();
        applySite(entity, request);
        return ok(PythonCrawlClient.toDto(crawlJobService.saveSite(entity)));
    }

    public Result<CrawlSiteDTO> updateSite(String siteId, UpsertCrawlSiteRequest request) {
        CrawlSiteEntity entity = crawlJobService.getSite(siteId);
        applySite(entity, request);
        return ok(PythonCrawlClient.toDto(crawlJobService.saveSite(entity)));
    }

    public Result<CrawlOrchestratorStateDTO> getOrchestratorState() {
        return ok(enrichOrchestratorState(orchestratorStateService.getState()));
    }

    public Result<CrawlOrchestratorStateDTO> setOrchestratorGoal(SetOrchestratorGoalRequest request) {
        CrawlOrchestratorStateDTO state = orchestratorStateService.setGoal(request.goal());
        triggerOrchestratorCycle();
        return ok(enrichOrchestratorState(state));
    }

    public Result<CrawlOrchestratorStateDTO> wakeOrchestrator() {
        CrawlOrchestratorStateDTO state = orchestratorStateService.wake();
        triggerOrchestratorCycle();
        return ok(enrichOrchestratorState(state));
    }

    public Result<CrawlOrchestratorStateDTO> clearOrchestratorGoal() {
        return ok(enrichOrchestratorState(orchestratorStateService.clearGoal()));
    }

    public Result<OrchestratorDecisionsDTO> listOrchestratorDecisions(long afterSeq, int limit) {
        return ok(orchestratorStateService.listDecisions(afterSeq, limit));
    }

    private CrawlOrchestratorStateDTO enrichOrchestratorState(CrawlOrchestratorStateDTO base) {
        try {
            Map<String, Object> agent = pythonCrawlClient.getOrchestratorAgentStatus();
            return new CrawlOrchestratorStateDTO(
                base.goal(),
                base.status(),
                base.runningJobCount(),
                base.maxConcurrentJobs(),
                base.lastDecision(),
                base.updatedAt(),
                Boolean.TRUE.equals(agent.get("enabled")),
                Boolean.TRUE.equals(agent.get("llm_configured"))
            );
        } catch (Exception ex) {
            return new CrawlOrchestratorStateDTO(
                base.goal(),
                base.status(),
                base.runningJobCount(),
                base.maxConcurrentJobs(),
                base.lastDecision(),
                base.updatedAt(),
                null,
                null
            );
        }
    }

    private void triggerOrchestratorCycle() {
        try {
            pythonCrawlClient.triggerOrchestratorCycle();
        } catch (Exception ex) {
            orchestratorStateService.recordDecision(
                "触发主编排失败：" + (ex.getMessage() == null ? "python-ai 不可达" : ex.getMessage())
            );
        }
    }

    private void applySite(CrawlSiteEntity entity, UpsertCrawlSiteRequest request) {
        entity.setName(request.name().trim());
        entity.setBaseUrl(request.baseUrl());
        entity.setConfigJson(request.configJson());
        if (request.enabled() != null) {
            entity.setEnabled(request.enabled());
        }
        entity.setRemark(request.remark());
    }
}
