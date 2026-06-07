package com.novel.agent.content.service.crawl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.common.core.exception.NotFoundException;
import com.novel.agent.common.core.exception.ValidationException;
import com.novel.agent.common.mq.constant.MqTopic;
import com.novel.agent.common.mq.crawl.CrawlDispatchMessage;
import com.novel.agent.common.mq.producer.IMessageProducer;
import com.novel.agent.content.crawl.CrawlJobStatus;
import com.novel.agent.content.crawl.CrawlLogLevel;
import com.novel.agent.content.entity.CrawlCatalogNovelEntity;
import com.novel.agent.content.entity.CrawlJobEntity;
import com.novel.agent.content.entity.CrawlSiteEntity;
import com.novel.agent.content.repository.CrawlJobRepository;
import com.novel.agent.content.repository.CrawlSiteRepository;
import com.novel.agent.content.service.catalog.CatalogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlJobService {

    private static final Set<CrawlJobStatus> STARTABLE = Set.of(
        CrawlJobStatus.PENDING,
        CrawlJobStatus.PAUSED,
        CrawlJobStatus.FAILED
    );

    private final CrawlJobRepository crawlJobRepository;
    private final CrawlSiteRepository crawlSiteRepository;
    private final CatalogService catalogService;
    private final IMessageProducer messageProducer;
    private final ObjectMapper objectMapper;
    private final CrawlJobLogService crawlJobLogService;

    public CrawlJobEntity getJob(String jobId) {
        return crawlJobRepository.findById(jobId)
            .orElseThrow(() -> new NotFoundException(ResultCode.NOT_FOUND, "爬虫任务不存在"));
    }

    public Page<CrawlJobEntity> pageJobs(int pageCurrent, int pageSize) {
        int page = Math.max(0, pageCurrent - 1);
        int size = Math.max(1, Math.min(pageSize, 100));
        return crawlJobRepository.findAllByOrderByUpdatedAtDesc(PageRequest.of(page, size));
    }

    @Transactional
    public CrawlJobEntity saveJob(CrawlJobEntity entity) {
        return crawlJobRepository.save(entity);
    }

    @Transactional
    public CrawlJobEntity createJob(
        String sourceUrl,
        Long createdByAdminId,
        String siteId,
        String configJson
    ) {
        if (sourceUrl == null || sourceUrl.isBlank()) {
            throw new ValidationException(ResultCode.BAD_REQUEST, "sourceUrl 不能为空");
        }
        CrawlJobEntity entity = new CrawlJobEntity();
        entity.setSourceUrl(sourceUrl.trim());
        entity.setCreatedByAdminId(createdByAdminId);
        entity.setSiteId(siteId);
        entity.setConfigJson(resolveConfigJson(siteId, configJson));
        entity.setStatus(CrawlJobStatus.PENDING);
        return crawlJobRepository.save(entity);
    }

    @Transactional
    public CrawlJobEntity startJob(String jobId) {
        CrawlJobEntity entity = getJob(jobId);
        if (!STARTABLE.contains(entity.getStatus())) {
            throw new ValidationException(ResultCode.BAD_REQUEST, "当前状态不可启动: " + entity.getStatus());
        }
        entity.setStatus(CrawlJobStatus.RUNNING);
        entity.setErrorMessage(null);
        if (entity.getStartedAt() == null) {
            entity.setStartedAt(Instant.now());
        }
        CrawlJobEntity saved = crawlJobRepository.save(entity);
        messageProducer.send(
            MqTopic.CRAWL_DISPATCH,
            new CrawlDispatchMessage(
                saved.getId(),
                saved.getSourceUrl(),
                saved.getConfigJson(),
                1
            )
        );
        crawlJobLogService.append(saved.getId(), CrawlLogLevel.INFO, "任务已启动，正在派发至执行队列…");
        return saved;
    }

    @Transactional
    public CrawlJobEntity pauseJob(String jobId) {
        CrawlJobEntity entity = getJob(jobId);
        if (entity.getStatus() != CrawlJobStatus.RUNNING && entity.getStatus() != CrawlJobStatus.PENDING) {
            throw new ValidationException(ResultCode.BAD_REQUEST, "当前状态不可暂停");
        }
        entity.setStatus(CrawlJobStatus.PAUSED);
        CrawlJobEntity saved = crawlJobRepository.save(entity);
        crawlJobLogService.append(saved.getId(), CrawlLogLevel.WARN, "任务已暂停");
        return saved;
    }

    @Transactional
    public CrawlJobEntity cancelJob(String jobId) {
        CrawlJobEntity entity = getJob(jobId);
        entity.setStatus(CrawlJobStatus.CANCELLED);
        entity.setCompletedAt(Instant.now());
        CrawlJobEntity saved = crawlJobRepository.save(entity);
        crawlJobLogService.append(saved.getId(), CrawlLogLevel.WARN, "任务已取消");
        return saved;
    }

    @Transactional
    public void deleteJob(String jobId) {
        CrawlJobEntity entity = getJob(jobId);
        if (entity.getStatus() == CrawlJobStatus.RUNNING) {
            throw new ValidationException(ResultCode.BAD_REQUEST, "运行中的任务请先取消");
        }
        crawlJobLogService.clear(jobId);
        crawlJobRepository.delete(entity);
    }

    @Transactional
    public CrawlJobEntity updateProgress(
        String jobId,
        Integer chaptersTotal,
        Integer chaptersDone,
        String title,
        CrawlJobStatus status
    ) {
        CrawlJobEntity entity = getJob(jobId);
        if (chaptersTotal != null) {
            entity.setChaptersTotal(chaptersTotal);
        }
        if (chaptersDone != null) {
            entity.setChaptersDone(chaptersDone);
        }
        if (title != null && !title.isBlank()) {
            entity.setTitle(title.trim());
        }
        if (status != null) {
            entity.setStatus(status);
            if (status == CrawlJobStatus.RUNNING && entity.getStartedAt() == null) {
                entity.setStartedAt(Instant.now());
            }
        }
        return crawlJobRepository.save(entity);
    }

    @Transactional
    public CrawlJobEntity mergeRuntimeState(String jobId, Map<String, Object> runtime) {
        CrawlJobEntity entity = getJob(jobId);
        Map<String, Object> config = new LinkedHashMap<>(parseConfigJson(entity.getConfigJson()));
        config.put("_runtime", runtime == null ? Map.of() : runtime);
        try {
            entity.setConfigJson(objectMapper.writeValueAsString(config));
        } catch (JsonProcessingException ex) {
            throw new ValidationException(ResultCode.BAD_REQUEST, "runtime 序列化失败");
        }
        return crawlJobRepository.save(entity);
    }

    @Transactional
    public CrawlCatalogNovelEntity initCatalog(
        String jobId,
        String title,
        String author,
        String description,
        String sourceUrl
    ) {
        CrawlJobEntity job = getJob(jobId);
        if (job.getCatalogNovelId() != null && !job.getCatalogNovelId().isBlank()) {
            return catalogService.findCatalogEntity(job.getCatalogNovelId());
        }
        CrawlCatalogNovelEntity catalog = catalogService.initFromJob(
            jobId, title, author, description, sourceUrl
        );
        job.setCatalogNovelId(catalog.getId());
        job.setTitle(title);
        crawlJobRepository.save(job);
        return catalog;
    }

    @Transactional
    public Map<String, Object> importChapter(
        String jobId,
        String title,
        String content,
        int sortOrder,
        String sourceUrl
    ) {
        CrawlJobEntity job = getJob(jobId);
        if (job.getStatus() == CrawlJobStatus.CANCELLED || job.getStatus() == CrawlJobStatus.PAUSED) {
            throw new ValidationException(ResultCode.BAD_REQUEST, "任务已停止");
        }
        String catalogNovelId = job.getCatalogNovelId();
        if (catalogNovelId == null || catalogNovelId.isBlank()) {
            throw new ValidationException(ResultCode.BAD_REQUEST, "书库作品未初始化");
        }
        catalogService.addChapter(
            catalogNovelId,
            title == null || title.isBlank() ? "第" + sortOrder + "章" : title.trim(),
            content,
            sortOrder,
            sourceUrl
        );
        return Map.of("catalogNovelId", catalogNovelId, "sortOrder", sortOrder);
    }

    @Transactional
    public CrawlCatalogNovelEntity setCatalogCover(String jobId, String coverUrl) {
        CrawlJobEntity job = getJob(jobId);
        String catalogNovelId = job.getCatalogNovelId();
        if (catalogNovelId == null || catalogNovelId.isBlank()) {
            throw new ValidationException(ResultCode.BAD_REQUEST, "书库作品未关联，无法更新封面");
        }
        if (coverUrl == null || coverUrl.isBlank()) {
            throw new ValidationException(ResultCode.BAD_REQUEST, "coverUrl 不能为空");
        }
        return catalogService.setCoverUrl(catalogNovelId, coverUrl.trim());
    }

    @Transactional
    public CrawlJobEntity completeJob(String jobId, String catalogNovelId, String title) {
        CrawlJobEntity entity = getJob(jobId);
        entity.setStatus(CrawlJobStatus.COMPLETED);
        entity.setCatalogNovelId(catalogNovelId);
        if (title != null && !title.isBlank()) {
            entity.setTitle(title.trim());
        }
        entity.setCompletedAt(Instant.now());
        return crawlJobRepository.save(entity);
    }

    @Transactional
    public CrawlJobEntity failJob(String jobId, String errorMessage) {
        CrawlJobEntity entity = getJob(jobId);
        entity.setStatus(CrawlJobStatus.FAILED);
        entity.setErrorMessage(errorMessage);
        entity.setCompletedAt(Instant.now());
        return crawlJobRepository.save(entity);
    }

    public List<CrawlSiteEntity> listAllSites() {
        return crawlSiteRepository.findAll();
    }

    @Transactional
    public CrawlSiteEntity saveSite(CrawlSiteEntity entity) {
        return crawlSiteRepository.save(entity);
    }

    public CrawlSiteEntity getSite(String siteId) {
        return crawlSiteRepository.findById(siteId)
            .orElseThrow(() -> new NotFoundException(ResultCode.NOT_FOUND, "站点配置不存在"));
    }

    private String resolveConfigJson(String siteId, String overrideJson) {
        if (overrideJson != null && !overrideJson.isBlank()) {
            return overrideJson;
        }
        if (siteId == null || siteId.isBlank()) {
            return null;
        }
        return getSite(siteId).getConfigJson();
    }

    public Map<String, Object> parseConfigJson(String configJson) {
        if (configJson == null || configJson.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(configJson, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            log.warn("解析 crawl config 失败: {}", ex.getMessage());
            return new LinkedHashMap<>();
        }
    }
}
