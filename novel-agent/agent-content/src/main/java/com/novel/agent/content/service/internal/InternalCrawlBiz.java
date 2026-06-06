package com.novel.agent.content.service.internal;

import com.novel.agent.content.entity.CrawlCatalogNovelEntity;
import com.novel.agent.content.service.crawl.CrawlJobService;
import com.novel.agent.content.service.crawl.PythonCrawlClient;
import com.novel.agent.content.service.crawl.dto.CrawlImportChapterRequest;
import com.novel.agent.content.service.crawl.dto.CrawlJobDTO;
import com.novel.agent.content.service.crawl.dto.CrawlProgressRequest;
import com.novel.agent.content.service.crawl.dto.InitCatalogRequest;
import com.novel.agent.content.crawl.CrawlJobStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class InternalCrawlBiz {

    private final CrawlJobService crawlJobService;

    public CrawlJobDTO getJob(String jobId) {
        return PythonCrawlClient.toDto(crawlJobService.getJob(jobId));
    }

    public CrawlJobDTO updateProgress(String jobId, CrawlProgressRequest request) {
        CrawlJobStatus status = null;
        if (request.status() != null && !request.status().isBlank()) {
            status = CrawlJobStatus.valueOf(request.status().trim().toUpperCase());
        }
        return PythonCrawlClient.toDto(crawlJobService.updateProgress(
            jobId,
            request.chaptersTotal(),
            request.chaptersDone(),
            request.title(),
            status
        ));
    }

    public Map<String, Object> initCatalog(String jobId, InitCatalogRequest request) {
        CrawlCatalogNovelEntity catalog = crawlJobService.initCatalog(
            jobId,
            request.title(),
            request.author(),
            request.description(),
            request.sourceUrl()
        );
        return Map.of("catalogNovelId", catalog.getId());
    }

    public Map<String, Object> importChapter(String jobId, CrawlImportChapterRequest request) {
        return crawlJobService.importChapter(
            jobId,
            request.title(),
            request.content(),
            request.sortOrder(),
            request.sourceUrl()
        );
    }

    public CrawlJobDTO completeJob(String jobId, String catalogNovelId, String title) {
        return PythonCrawlClient.toDto(crawlJobService.completeJob(jobId, catalogNovelId, title));
    }

    public CrawlJobDTO failJob(String jobId, String errorMessage) {
        return PythonCrawlClient.toDto(crawlJobService.failJob(jobId, errorMessage));
    }
}
