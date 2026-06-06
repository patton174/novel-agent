package com.novel.agent.content.service.catalog;

import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.common.core.exception.NotFoundException;
import com.novel.agent.content.dto.CreateChapterRequest;
import com.novel.agent.content.dto.CreateNovelRequest;
import com.novel.agent.content.dto.NovelDTO;
import com.novel.agent.content.entity.CrawlCatalogChapterEntity;
import com.novel.agent.content.entity.CrawlCatalogNovelEntity;
import com.novel.agent.content.repository.CrawlCatalogChapterRepository;
import com.novel.agent.content.repository.CrawlCatalogNovelRepository;
import com.novel.agent.content.service.ChapterService;
import com.novel.agent.content.service.NovelService;
import com.novel.agent.content.service.crawl.dto.CatalogChapterSummaryDTO;
import com.novel.agent.content.service.crawl.dto.CatalogNovelDTO;
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
}
