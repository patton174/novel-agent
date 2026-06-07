package com.novel.agent.content.service.internal;

import com.novel.agent.content.entity.CrawlCatalogNovelEntity;
import com.novel.agent.content.entity.CrawlJobEntity;
import com.novel.agent.content.service.crawl.CrawlJobLogService;
import com.novel.agent.content.service.crawl.CrawlJobService;
import com.novel.agent.content.service.crawl.PythonCrawlClient;
import com.novel.agent.content.service.crawl.dto.AppendCrawlLogRequest;
import com.novel.agent.content.service.crawl.dto.CrawlImportChapterRequest;
import com.novel.agent.content.service.crawl.dto.CrawlJobDTO;
import com.novel.agent.content.service.crawl.dto.CrawlProgressRequest;
import com.novel.agent.content.service.crawl.dto.InitCatalogRequest;
import com.novel.agent.content.service.crawl.dto.SetCatalogCoverRequest;
import com.novel.agent.content.crawl.CrawlJobStatus;
import com.novel.agent.content.crawl.CrawlLogLevel;
import com.novel.agent.content.repository.CrawlJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class InternalCrawlBiz {

    /** 占用并发槽位的状态：运行中 + 已暂停（暂停不释放槽位） */
    private static final Set<CrawlJobStatus> ACTIVE_JOB_STATUSES = Set.of(
        CrawlJobStatus.RUNNING,
        CrawlJobStatus.PAUSED
    );

    private final CrawlJobService crawlJobService;
    private final CrawlJobLogService crawlJobLogService;
    private final CrawlJobRepository crawlJobRepository;

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

    public Map<String, Object> setCatalogCover(String jobId, SetCatalogCoverRequest request) {
        var catalog = crawlJobService.setCatalogCover(jobId, request.coverUrl());
        return Map.of("catalogNovelId", catalog.id(), "coverUrl", catalog.coverUrl());
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

    public CrawlJobDTO mergeRuntime(String jobId, Map<String, Object> runtime) {
        return PythonCrawlClient.toDto(crawlJobService.mergeRuntimeState(jobId, runtime));
    }

    public void appendLog(String jobId, AppendCrawlLogRequest request) {
        CrawlLogLevel level;
        try {
            level = CrawlLogLevel.valueOf(request.level().trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            level = CrawlLogLevel.INFO;
        }
        crawlJobLogService.append(jobId, level, request.message());
    }

    /** RUNNING + PAUSED 均占用并发槽位 */
    public long runningJobCount() {
        return crawlJobRepository.countByStatusIn(ACTIVE_JOB_STATUSES);
    }

    public CrawlJobEntity pauseJob(String jobId) {
        return crawlJobService.pauseJob(jobId);
    }

    public CrawlJobEntity cancelJob(String jobId) {
        return crawlJobService.cancelJob(jobId);
    }
}
