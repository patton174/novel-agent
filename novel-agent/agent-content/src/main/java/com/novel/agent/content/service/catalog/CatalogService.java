package com.novel.agent.content.service.catalog;

import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.common.core.exception.NotFoundException;
import com.novel.agent.content.dto.CreateChapterRequest;
import com.novel.agent.content.dto.CreateNovelRequest;
import com.novel.agent.content.dto.NovelDTO;
import com.novel.agent.content.entity.CrawlCatalogChapterEntity;
import com.novel.agent.content.entity.CrawlCatalogNovelEntity;
import com.novel.agent.content.entity.CrawlJobEntity;
import com.novel.agent.content.repository.CrawlCatalogChapterRepository;
import com.novel.agent.content.repository.CrawlCatalogNovelRepository;
import com.novel.agent.content.repository.CrawlJobRepository;
import com.novel.agent.content.service.ChapterService;
import com.novel.agent.content.service.NovelService;
import com.novel.agent.content.service.crawl.dto.CatalogChapterDetailDTO;
import com.novel.agent.content.service.crawl.dto.CatalogChapterSummaryDTO;
import com.novel.agent.content.service.crawl.dto.CatalogNovelDTO;
import com.novel.agent.content.service.crawl.dto.CatalogNovelProgressDTO;
import com.novel.agent.content.service.crawl.dto.CatalogOverviewDTO;
import com.novel.agent.content.service.crawl.dto.UpdateCatalogChapterRequest;
import com.novel.agent.content.service.crawl.dto.UpdateCatalogNovelRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CatalogService {

    private final CrawlCatalogNovelRepository catalogNovelRepository;
    private final CrawlCatalogChapterRepository catalogChapterRepository;
    private final CrawlJobRepository crawlJobRepository;
    private final NovelService novelService;
    private final ChapterService chapterService;

    public Page<CatalogNovelDTO> pageCatalog(int pageCurrent, int pageSize) {
        int page = Math.max(0, pageCurrent - 1);
        int size = Math.max(1, Math.min(pageSize, 50));
        return catalogNovelRepository.findAllByOrderByUpdatedAtDesc(PageRequest.of(page, size))
            .map(this::toDto);
    }

    public CatalogNovelDTO getCatalog(String catalogNovelId) {
        return toDto(findCatalog(catalogNovelId));
    }

    public List<CatalogChapterSummaryDTO> listChapters(String catalogNovelId) {
        findCatalog(catalogNovelId);
        return catalogChapterRepository.findByCatalogNovelIdOrderBySortOrderAsc(catalogNovelId)
            .stream()
            .map(this::toChapterSummary)
            .toList();
    }

    public CatalogChapterDetailDTO getChapter(String catalogNovelId, String chapterId) {
        findCatalog(catalogNovelId);
        return toChapterDetail(findChapter(catalogNovelId, chapterId));
    }

    @Transactional
    public CatalogChapterDetailDTO updateChapter(
        String catalogNovelId,
        String chapterId,
        UpdateCatalogChapterRequest request
    ) {
        CrawlCatalogChapterEntity entity = findChapter(catalogNovelId, chapterId);
        if (request.title() != null && !request.title().isBlank()) {
            entity.setTitle(request.title().trim());
        }
        if (request.content() != null) {
            entity.setContent(request.content());
            entity.setWordCount(request.content().length());
        }
        if (request.sortOrder() != null) {
            entity.setSortOrder(request.sortOrder());
        }
        if (request.sourceUrl() != null) {
            entity.setSourceUrl(request.sourceUrl().trim());
        }
        return toChapterDetail(catalogChapterRepository.save(entity));
    }

    @Transactional
    public void deleteChapter(String catalogNovelId, String chapterId) {
        findCatalog(catalogNovelId);
        CrawlCatalogChapterEntity entity = findChapter(catalogNovelId, chapterId);
        catalogChapterRepository.delete(entity);
        CrawlCatalogNovelEntity novel = findCatalog(catalogNovelId);
        novel.setChapterCount(catalogChapterRepository.countByCatalogNovelId(catalogNovelId));
        catalogNovelRepository.save(novel);
    }

    @Transactional
    public CrawlCatalogNovelEntity initFromJob(
        String jobId,
        String title,
        String author,
        String description,
        String sourceUrl
    ) {
        CrawlCatalogNovelEntity entity = new CrawlCatalogNovelEntity();
        entity.setJobId(jobId);
        entity.setTitle(title.trim());
        entity.setAuthor(author);
        entity.setDescription(description);
        entity.setSourceUrl(sourceUrl);
        entity.setChapterCount(0);
        return catalogNovelRepository.save(entity);
    }

    @Transactional
    public CrawlCatalogChapterEntity addChapter(
        String catalogNovelId,
        String title,
        String content,
        int sortOrder,
        String sourceUrl
    ) {
        CrawlCatalogNovelEntity novel = findCatalog(catalogNovelId);
        CrawlCatalogChapterEntity chapter = new CrawlCatalogChapterEntity();
        chapter.setCatalogNovelId(catalogNovelId);
        chapter.setTitle(title);
        chapter.setContent(content == null ? "" : content);
        chapter.setSortOrder(sortOrder);
        chapter.setSourceUrl(sourceUrl);
        CrawlCatalogChapterEntity saved = catalogChapterRepository.save(chapter);
        novel.setChapterCount(catalogChapterRepository.countByCatalogNovelId(catalogNovelId));
        catalogNovelRepository.save(novel);
        return saved;
    }

    @Transactional
    public NovelDTO addToUserLibrary(Long userId, String catalogNovelId) {
        CrawlCatalogNovelEntity catalog = findCatalog(catalogNovelId);
        List<CrawlCatalogChapterEntity> chapters =
            catalogChapterRepository.findByCatalogNovelIdOrderBySortOrderAsc(catalogNovelId);
        if (chapters.isEmpty()) {
            throw new NotFoundException(ResultCode.NOT_FOUND, "该书库作品尚无章节");
        }
        NovelDTO novel = novelService.createNovel(
            userId,
            new CreateNovelRequest(
                catalog.getTitle(),
                catalog.getDescription() != null
                    ? catalog.getDescription()
                    : "来自书库：" + catalog.getSourceUrl(),
                null,
                null,
                3000
            )
        );
        for (CrawlCatalogChapterEntity chapter : chapters) {
            chapterService.createChapter(
                userId,
                novel.id(),
                new CreateChapterRequest(
                    chapter.getTitle(),
                    chapter.getContent(),
                    null,
                    null,
                    chapter.getSortOrder()
                )
            );
        }
        return novel;
    }

    public List<CatalogNovelProgressDTO> listIncomplete(int limit) {
        int size = Math.max(1, Math.min(limit, 100));
        return crawlJobRepository.findIncompleteJobs(PageRequest.of(0, size))
            .stream()
            .map(this::toProgressFromJob)
            .distinct()
            .toList();
    }

    public List<CatalogNovelProgressDTO> listMissingCover(int limit) {
        int size = Math.max(1, Math.min(limit, 100));
        return catalogNovelRepository.findMissingCover(PageRequest.of(0, size))
            .stream()
            .map(novel -> toProgress(novel, null))
            .toList();
    }

    public CatalogOverviewDTO buildOrchestratorOverview(int limit) {
        int size = Math.max(1, Math.min(limit, 50));
        long total = catalogNovelRepository.count();
        Page<CrawlCatalogNovelEntity> missingPage = catalogNovelRepository.findMissingCover(PageRequest.of(0, size));
        List<CatalogNovelProgressDTO> missing = missingPage.stream()
            .map(novel -> toProgress(novel, null))
            .toList();
        List<CatalogNovelProgressDTO> incomplete = listIncomplete(size);
        List<CatalogNovelProgressDTO> recent = catalogNovelRepository
            .findAllByOrderByUpdatedAtDesc(PageRequest.of(0, size))
            .stream()
            .map(novel -> toProgress(novel, null))
            .toList();
        return new CatalogOverviewDTO(total, missingPage.getTotalElements(), missing, incomplete, recent);
    }

    @Transactional
    public CatalogNovelDTO updateCatalog(String catalogNovelId, UpdateCatalogNovelRequest request) {
        CrawlCatalogNovelEntity entity = findCatalog(catalogNovelId);
        if (request.title() != null && !request.title().isBlank()) {
            entity.setTitle(request.title().trim());
        }
        if (request.author() != null) {
            entity.setAuthor(request.author().trim());
        }
        if (request.description() != null) {
            entity.setDescription(request.description());
        }
        if (request.coverUrl() != null) {
            entity.setCoverUrl(request.coverUrl().trim());
        }
        if (request.sourceUrl() != null && !request.sourceUrl().isBlank()) {
            entity.setSourceUrl(request.sourceUrl().trim());
        }
        return toDto(catalogNovelRepository.save(entity));
    }

    @Transactional
    public void deleteCatalog(String catalogNovelId) {
        findCatalog(catalogNovelId);
        catalogChapterRepository.deleteByCatalogNovelId(catalogNovelId);
        catalogNovelRepository.deleteById(catalogNovelId);
    }

    public CatalogNovelProgressDTO getCatalogProgress(String catalogNovelId) {
        CrawlCatalogNovelEntity novel = findCatalog(catalogNovelId);
        List<CrawlJobEntity> jobs = crawlJobRepository.findByCatalogNovelIdOrderByUpdatedAtDesc(catalogNovelId);
        CrawlJobEntity latest = jobs.isEmpty() ? null : jobs.get(0);
        return toProgress(novel, latest);
    }

    @Transactional
    public CatalogNovelDTO setCoverUrl(String catalogNovelId, String coverUrl) {
        CrawlCatalogNovelEntity entity = findCatalog(catalogNovelId);
        entity.setCoverUrl(coverUrl == null ? null : coverUrl.trim());
        return toDto(catalogNovelRepository.save(entity));
    }

    private CatalogNovelProgressDTO toProgressFromJob(CrawlJobEntity job) {
        if (job.getCatalogNovelId() != null && !job.getCatalogNovelId().isBlank()) {
            try {
                return getCatalogProgress(job.getCatalogNovelId());
            } catch (NotFoundException ignored) {
                // fall through
            }
        }
        int done = job.getChaptersDone() == null ? 0 : job.getChaptersDone();
        int total = job.getChaptersTotal() == null ? 0 : job.getChaptersTotal();
        return new CatalogNovelProgressDTO(
            job.getCatalogNovelId(),
            job.getTitle() == null ? "" : job.getTitle(),
            "",
            "",
            job.getSourceUrl(),
            null,
            done,
            total > 0 ? total : null,
            done,
            total <= 0 || done >= total,
            job.getId(),
            job.getStatus().name(),
            job.getCreatedAt().toEpochMilli(),
            job.getUpdatedAt().toEpochMilli()
        );
    }

    private CatalogNovelProgressDTO toProgress(CrawlCatalogNovelEntity novel, CrawlJobEntity latest) {
        int saved = novel.getChapterCount() == null ? 0 : novel.getChapterCount();
        Integer expected = latest != null && latest.getChaptersTotal() != null ? latest.getChaptersTotal() : null;
        int done = latest != null && latest.getChaptersDone() != null ? latest.getChaptersDone() : saved;
        boolean complete = expected != null && expected > 0 && done >= expected;
        return new CatalogNovelProgressDTO(
            novel.getId(),
            novel.getTitle(),
            novel.getAuthor(),
            novel.getDescription(),
            novel.getSourceUrl(),
            novel.getCoverUrl(),
            saved,
            expected,
            done,
            complete,
            latest != null ? latest.getId() : null,
            latest != null ? latest.getStatus().name() : null,
            novel.getCreatedAt().toEpochMilli(),
            novel.getUpdatedAt().toEpochMilli()
        );
    }

    private CrawlCatalogNovelEntity findCatalog(String catalogNovelId) {
        return catalogNovelRepository.findById(catalogNovelId)
            .orElseThrow(() -> new NotFoundException(ResultCode.NOT_FOUND, "书库作品不存在"));
    }

    public CrawlCatalogNovelEntity findCatalogEntity(String catalogNovelId) {
        return findCatalog(catalogNovelId);
    }

    private CatalogNovelDTO toDto(CrawlCatalogNovelEntity entity) {
        return new CatalogNovelDTO(
            entity.getId(),
            entity.getTitle(),
            entity.getAuthor(),
            entity.getDescription(),
            entity.getSourceUrl(),
            entity.getCoverUrl(),
            entity.getChapterCount() == null ? 0 : entity.getChapterCount(),
            entity.getCreatedAt().toEpochMilli(),
            entity.getUpdatedAt().toEpochMilli()
        );
    }

    private CrawlCatalogChapterEntity findChapter(String catalogNovelId, String chapterId) {
        return catalogChapterRepository.findById(chapterId)
            .filter(ch -> catalogNovelId.equals(ch.getCatalogNovelId()))
            .orElseThrow(() -> new NotFoundException(ResultCode.NOT_FOUND, "书库章节不存在"));
    }

    private CatalogChapterSummaryDTO toChapterSummary(CrawlCatalogChapterEntity entity) {
        return new CatalogChapterSummaryDTO(
            entity.getId(),
            entity.getCatalogNovelId(),
            entity.getTitle(),
            entity.getSortOrder(),
            entity.getWordCount() == null ? 0 : entity.getWordCount(),
            entity.getSourceUrl()
        );
    }

    private CatalogChapterDetailDTO toChapterDetail(CrawlCatalogChapterEntity entity) {
        return new CatalogChapterDetailDTO(
            entity.getId(),
            entity.getCatalogNovelId(),
            entity.getTitle(),
            entity.getContent() == null ? "" : entity.getContent(),
            entity.getSortOrder() == null ? 0 : entity.getSortOrder(),
            entity.getWordCount() == null ? 0 : entity.getWordCount(),
            entity.getSourceUrl(),
            entity.getCreatedAt().toEpochMilli()
        );
    }
}
