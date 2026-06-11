package cn.novelstudio.module.content.controller.crm;

import cn.novelstudio.kernel.base.Page;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import cn.novelstudio.module.content.service.crawl.dto.CreateCrawlJobRequest;
import cn.novelstudio.module.content.service.crawl.dto.CrawlJobDTO;
import cn.novelstudio.module.content.service.crawl.dto.CrawlLogsResponse;
import cn.novelstudio.module.content.service.crawl.dto.CrawlPreviewRequest;
import cn.novelstudio.module.content.service.crawl.dto.CrawlSiteDTO;
import cn.novelstudio.module.content.service.crawl.dto.UpsertCrawlSiteRequest;
import cn.novelstudio.module.content.service.crm.biz.CrmCrawlBiz;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/content/crm/crawl")
@RequiredArgsConstructor
public class CrmCrawlController extends BaseController {

    private final CrmCrawlBiz biz;

    @GetMapping("/jobs/page")
    public Result<Page<CrawlJobDTO>> pageJobs(
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return biz.pageJobs(pageCurrent, pageSize);
    }

    @GetMapping("/jobs/{jobId}")
    public Result<CrawlJobDTO> getJob(@PathVariable String jobId) {
        return biz.getJob(jobId);
    }

    @PostMapping("/jobs")
    public Result<CrawlJobDTO> createJob(
        @RequestHeader("X-User-Id") String userId,
        @Valid @RequestBody CreateCrawlJobRequest request
    ) {
        return biz.createJob(parseUserId(userId), request);
    }

    @PostMapping("/jobs/{jobId}/start")
    public Result<CrawlJobDTO> startJob(@PathVariable String jobId) {
        return biz.startJob(jobId);
    }

    @PostMapping("/jobs/{jobId}/pause")
    public Result<CrawlJobDTO> pauseJob(@PathVariable String jobId) {
        return biz.pauseJob(jobId);
    }

    @PostMapping("/jobs/{jobId}/cancel")
    public Result<CrawlJobDTO> cancelJob(@PathVariable String jobId) {
        return biz.cancelJob(jobId);
    }

    @DeleteMapping("/jobs/{jobId}")
    public Result<Void> deleteJob(@PathVariable String jobId) {
        return biz.deleteJob(jobId);
    }

    @GetMapping("/jobs/{jobId}/logs")
    public Result<CrawlLogsResponse> listLogs(
        @PathVariable String jobId,
        @RequestParam(defaultValue = "0") long afterSeq
    ) {
        return biz.listLogs(jobId, afterSeq);
    }

    @PostMapping("/preview")
    public Result<Map<String, Object>> preview(@Valid @RequestBody CrawlPreviewRequest request) {
        return biz.preview(request);
    }

    @GetMapping("/sites")
    public Result<List<CrawlSiteDTO>> listSites() {
        return biz.listSites();
    }

    @PostMapping("/sites")
    public Result<CrawlSiteDTO> createSite(@Valid @RequestBody UpsertCrawlSiteRequest request) {
        return biz.createSite(request);
    }

    @PutMapping("/sites/{siteId}")
    public Result<CrawlSiteDTO> updateSite(
        @PathVariable String siteId,
        @Valid @RequestBody UpsertCrawlSiteRequest request
    ) {
        return biz.updateSite(siteId, request);
    }
}
