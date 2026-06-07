package com.novel.agent.content.controller.internal;

import com.novel.agent.content.service.crawl.PythonCrawlClient;
import com.novel.agent.content.service.crawl.dto.AppendCrawlLogRequest;
import com.novel.agent.content.service.crawl.dto.CrawlImportChapterRequest;
import com.novel.agent.content.service.crawl.dto.CrawlJobDTO;
import com.novel.agent.content.service.crawl.dto.CrawlProgressRequest;
import com.novel.agent.content.service.crawl.dto.InitCatalogRequest;
import com.novel.agent.content.service.crawl.dto.SetCatalogCoverRequest;
import com.novel.agent.content.service.internal.InternalCrawlBiz;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/internal/crawl/jobs")
@RequiredArgsConstructor
public class InternalCrawlController {

    private final InternalCrawlBiz biz;

    @GetMapping("/{jobId}")
    public CrawlJobDTO getJob(@PathVariable String jobId) {
        return biz.getJob(jobId);
    }

    @PostMapping("/{jobId}/progress")
    public CrawlJobDTO updateProgress(
        @PathVariable String jobId,
        @RequestBody CrawlProgressRequest request
    ) {
        return biz.updateProgress(jobId, request);
    }

    @PostMapping("/{jobId}/catalog/init")
    public Map<String, Object> initCatalog(
        @PathVariable String jobId,
        @Valid @RequestBody InitCatalogRequest request
    ) {
        return biz.initCatalog(jobId, request);
    }

    @PostMapping("/{jobId}/catalog/cover")
    public Map<String, Object> setCatalogCover(
        @PathVariable String jobId,
        @Valid @RequestBody SetCatalogCoverRequest request
    ) {
        return biz.setCatalogCover(jobId, request);
    }

    @PostMapping("/{jobId}/chapters")
    public Map<String, Object> importChapter(
        @PathVariable String jobId,
        @Valid @RequestBody CrawlImportChapterRequest request
    ) {
        return biz.importChapter(jobId, request);
    }

    @PostMapping("/{jobId}/complete")
    public CrawlJobDTO completeJob(
        @PathVariable String jobId,
        @RequestBody Map<String, String> body
    ) {
        return biz.completeJob(jobId, body.get("catalogNovelId"), body.get("title"));
    }

    @PostMapping("/{jobId}/fail")
    public CrawlJobDTO failJob(
        @PathVariable String jobId,
        @RequestBody Map<String, String> body
    ) {
        return biz.failJob(jobId, body.get("errorMessage"));
    }

    @PostMapping("/{jobId}/logs")
    public Map<String, Object> appendLog(
        @PathVariable String jobId,
        @Valid @RequestBody AppendCrawlLogRequest request
    ) {
        biz.appendLog(jobId, request);
        return Map.of("ok", true);
    }

    @PostMapping("/{jobId}/runtime")
    public CrawlJobDTO mergeRuntime(
        @PathVariable String jobId,
        @RequestBody Map<String, Object> runtime
    ) {
        return biz.mergeRuntime(jobId, runtime);
    }

    @PostMapping("/{jobId}/pause")
    public CrawlJobDTO pauseJob(@PathVariable String jobId) {
        return PythonCrawlClient.toDto(biz.pauseJob(jobId));
    }

    @PostMapping("/{jobId}/cancel")
    public CrawlJobDTO cancelJob(@PathVariable String jobId) {
        return PythonCrawlClient.toDto(biz.cancelJob(jobId));
    }
}
