package com.novel.agent.content.service.crm.biz;

import com.novel.agent.common.core.base.Page;
import com.novel.agent.common.core.base.PageQuery;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.common.service.utils.SpringPageSupport;
import com.novel.agent.content.entity.CrawlJobEntity;
import com.novel.agent.content.entity.CrawlSiteEntity;
import com.novel.agent.content.repository.CrawlJobRepository;
import com.novel.agent.content.service.crawl.CrawlJobService;
import com.novel.agent.content.service.crawl.PythonCrawlClient;
import com.novel.agent.content.service.crawl.dto.CreateCrawlJobRequest;
import com.novel.agent.content.service.crawl.dto.CrawlJobDTO;
import com.novel.agent.content.service.crawl.dto.CrawlPreviewRequest;
import com.novel.agent.content.service.crawl.dto.CrawlSiteDTO;
import com.novel.agent.content.service.crawl.dto.UpsertCrawlSiteRequest;
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

    public Result<Map<String, Object>> preview(CrawlPreviewRequest request) {
        Map<String, Object> config = crawlJobService.parseConfigJson(request.configJson());
        if ((config == null || config.isEmpty()) && request.siteId() != null && !request.siteId().isBlank()) {
            config = crawlJobService.parseConfigJson(crawlJobService.getSite(request.siteId()).getConfigJson());
        }
        return ok(pythonCrawlClient.preview(request.sourceUrl(), config));
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
