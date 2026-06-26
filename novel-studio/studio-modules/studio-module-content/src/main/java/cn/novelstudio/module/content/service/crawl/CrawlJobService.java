package cn.novelstudio.module.content.service.crawl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.platform.messaging.constant.MqTopic;
import cn.novelstudio.platform.messaging.crawl.CrawlDispatchMessage;
import cn.novelstudio.platform.messaging.producer.IMessageProducer;
import cn.novelstudio.module.content.crawl.CrawlJobStatus;
import cn.novelstudio.module.content.crawl.CrawlLogLevel;
import cn.novelstudio.module.content.entity.CrawlCatalogNovelEntity;
import cn.novelstudio.module.content.entity.CrawlJobEntity;
import cn.novelstudio.module.content.entity.CrawlSiteEntity;
import cn.novelstudio.module.content.repository.CrawlJobRepository;
import cn.novelstudio.module.content.repository.CrawlSiteRepository;
import cn.novelstudio.module.content.service.catalog.CatalogService;
import cn.novelstudio.module.content.service.crawl.dto.CatalogNovelDTO;
import cn.novelstudio.platform.i18n.StudioMessages;
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
    private final StudioMessages messages;

    public CrawlJobEntity getJob(String jobId) {
        return crawlJobRepository.findById(jobId)
            .orElseThrow(() -> NotFoundException.keyed("content.crawl.job_not_found"));
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
            throw ValidationException.keyed(ResultCode.BAD_REQUEST, "content.crawl.source_url_required");
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
            throw ValidationException.keyed(ResultCode.BAD_REQUEST, "content.crawl.invalid_start_status", entity.getStatus());
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
        crawlJobLogService.append(saved.getId(), CrawlLogLevel.INFO, "content.crawl.log.started");
        return saved;
    }

    @Transactional
    public CrawlJobEntity pauseJob(String jobId) {
        CrawlJobEntity entity = getJob(jobId);
        if (entity.getStatus() != CrawlJobStatus.RUNNING && entity.getStatus() != CrawlJobStatus.PENDING) {
            throw ValidationException.keyed(ResultCode.BAD_REQUEST, "content.crawl.invalid_pause_status");
        }
        entity.setStatus(CrawlJobStatus.PAUSED);
        CrawlJobEntity saved = crawlJobRepository.save(entity);
        crawlJobLogService.append(saved.getId(), CrawlLogLevel.WARN, "content.crawl.log.paused");
        return saved;
    }

    @Transactional
    public CrawlJobEntity cancelJob(String jobId) {
        CrawlJobEntity entity = getJob(jobId);
        entity.setStatus(CrawlJobStatus.CANCELLED);
        entity.setCompletedAt(Instant.now());
        CrawlJobEntity saved = crawlJobRepository.save(entity);
        crawlJobLogService.append(saved.getId(), CrawlLogLevel.WARN, "content.crawl.log.cancelled");
        return saved;
    }

    @Transactional
    public void deleteJob(String jobId) {
        CrawlJobEntity entity = getJob(jobId);
        if (entity.getStatus() == CrawlJobStatus.RUNNING) {
            throw ValidationException.keyed(ResultCode.BAD_REQUEST, "content.crawl.cancel_running_first");
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
            throw ValidationException.keyed(ResultCode.BAD_REQUEST, "content.crawl.runtime_serialize_failed");
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
            throw ValidationException.keyed(ResultCode.BAD_REQUEST, "content.crawl.job_stopped");
        }
        String catalogNovelId = job.getCatalogNovelId();
        if (catalogNovelId == null || catalogNovelId.isBlank()) {
            throw ValidationException.keyed(ResultCode.BAD_REQUEST, "content.crawl.catalog_not_init");
        }
        catalogService.addChapter(
            catalogNovelId,
            title == null || title.isBlank() ? messages.get("content.chapter.default_title", sortOrder) : title.trim(),
            content,
            sortOrder,
            sourceUrl
        );
        return Map.of("catalogNovelId", catalogNovelId, "sortOrder", sortOrder);
    }

    @Transactional
    public CatalogNovelDTO setCatalogCover(String jobId, String coverUrl) {
        CrawlJobEntity job = getJob(jobId);
        String catalogNovelId = job.getCatalogNovelId();
        if (catalogNovelId == null || catalogNovelId.isBlank()) {
            throw ValidationException.keyed(ResultCode.BAD_REQUEST, "content.crawl.catalog_novel_missing");
        }
        if (coverUrl == null || coverUrl.isBlank()) {
            throw ValidationException.keyed(ResultCode.BAD_REQUEST, "content.crawl.cover_url_required");
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
            .orElseThrow(() -> NotFoundException.keyed("content.crawl.site_not_found"));
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
