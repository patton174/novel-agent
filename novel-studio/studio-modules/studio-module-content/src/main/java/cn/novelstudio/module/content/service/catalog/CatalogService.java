package cn.novelstudio.module.content.service.catalog;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.ForbiddenException;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.module.content.catalog.IndexStatus;
import cn.novelstudio.module.content.dto.LibraryReindexResultDTO;
import cn.novelstudio.platform.messaging.catalog.CatalogIndexMessage;
import cn.novelstudio.platform.messaging.constant.MqTopic;
import cn.novelstudio.platform.messaging.library.LibraryIndexMessage;
import cn.novelstudio.platform.messaging.producer.IMessageProducer;
import cn.novelstudio.platform.i18n.StudioMessages;
import cn.novelstudio.module.content.dto.CreateChapterRequest;
import cn.novelstudio.module.content.dto.CreateNovelRequest;
import cn.novelstudio.module.content.dto.NovelDTO;
import cn.novelstudio.module.content.dto.ReferencedBookDTO;
import cn.novelstudio.module.content.entity.CrawlCatalogChapterEntity;
import cn.novelstudio.module.content.entity.CrawlCatalogNovelEntity;
import cn.novelstudio.module.content.entity.UserLibraryCollectionEntity;
import cn.novelstudio.module.content.repository.CrawlCatalogChapterRepository;
import cn.novelstudio.module.content.repository.CrawlCatalogNovelRepository;
import cn.novelstudio.module.content.repository.UserLibraryCollectionRepository;
import cn.novelstudio.module.content.service.ChapterService;
import cn.novelstudio.module.content.service.NovelService;
import cn.novelstudio.module.content.service.crawl.dto.CatalogChapterDetailDTO;
import cn.novelstudio.module.content.service.crawl.dto.CatalogChapterSummaryDTO;
import cn.novelstudio.module.content.service.crawl.dto.CatalogNovelDTO;
import cn.novelstudio.module.content.service.crawl.dto.CatalogNovelProgressDTO;
import cn.novelstudio.module.content.service.crawl.dto.CatalogOverviewDTO;
import cn.novelstudio.module.content.service.crawl.dto.UpdateCatalogChapterRequest;
import cn.novelstudio.module.content.service.crawl.dto.UpdateCatalogNovelRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CatalogService {

    private static final Logger log = LoggerFactory.getLogger(CatalogService.class);

    private final CrawlCatalogNovelRepository catalogNovelRepository;
    private final CrawlCatalogChapterRepository catalogChapterRepository;
    private final UserLibraryCollectionRepository libraryCollectionRepository;
    private final NovelService novelService;
    private final ChapterService chapterService;
    private final ObjectProvider<IMessageProducer> messageProducerProvider;
    private final StudioMessages messages;

    public Page<CatalogNovelDTO> pageCatalog(int pageCurrent, int pageSize) {
        int page = Math.max(0, pageCurrent - 1);
        int size = Math.max(1, Math.min(pageSize, 50));
        return catalogNovelRepository.findByOwnerIdIsNullOrderByUpdatedAtDesc(PageRequest.of(page, size))
            .map(this::toDto);
    }

    /** 管理台：公共书库分页（与用户书城一致，仅 owner_id 为空）。 */
    public Page<CatalogNovelDTO> pagePublicCatalog(int pageCurrent, int pageSize) {
        return pageCatalog(pageCurrent, pageSize);
    }

    /**
     * 我的书库：用户上传入库 ∪ 收藏的公共书库条目。
     */
    public Page<CatalogNovelDTO> listMyLibrary(Long userId, int pageCurrent, int pageSize) {
        int page = Math.max(0, pageCurrent - 1);
        int size = Math.max(1, Math.min(pageSize, 50));
        return catalogNovelRepository.findMyLibrary(userId, PageRequest.of(page, size))
            .map(this::toDto);
    }

    /**
     * 收藏公共书库条目到我的书库（轻引用，幂等）。
     */
    @Transactional
    public void collect(Long userId, String catalogNovelId) {
        CrawlCatalogNovelEntity novel = findCatalog(catalogNovelId);
        if (novel.getOwnerId() != null) {
            throw ValidationException.keyed(ResultCode.BAD_REQUEST, "content.catalog.collect_public_only");
        }
        if (!libraryCollectionRepository.existsByUserIdAndCatalogNovelId(userId, catalogNovelId)) {
            UserLibraryCollectionEntity entity = new UserLibraryCollectionEntity();
            entity.setUserId(userId);
            entity.setCatalogNovelId(catalogNovelId);
            entity.setCollectedAt(Instant.now());
            libraryCollectionRepository.save(entity);
        }
    }

    /**
     * @引用候选：我的书库（上传+收藏），含索引状态，供 picker 搜索。
     */
    public List<ReferencedBookDTO> myLibrarySelectable(Long userId, String query) {
        List<CrawlCatalogNovelEntity> all = new ArrayList<>();
        all.addAll(catalogNovelRepository.findByOwnerId(userId));
        all.addAll(libraryCollectionRepository.findCatalogNovelsByUserId(userId));
        Map<String, CrawlCatalogNovelEntity> uniq = new LinkedHashMap<>();
        for (CrawlCatalogNovelEntity n : all) {
            uniq.putIfAbsent(n.getId(), n);
        }
        return uniq.values().stream()
            .filter(n -> query == null || query.isBlank()
                || (n.getTitle() != null && n.getTitle().contains(query)))
            .map(n -> {
                ReferencedBookDTO d = new ReferencedBookDTO();
                d.setCatalogNovelId(n.getId());
                d.setTitle(n.getTitle());
                d.setSummary(n.getDescription());
                d.setNamespace(n.getIndexNamespace());
                d.setIndexStatus(normalizeIndexStatus(n.getIndexStatus()));
                d.setChapterTitles(List.of());
                return d;
            })
            .toList();
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

    public List<CatalogNovelProgressDTO> listMissingCover(int limit) {
        int size = Math.max(1, Math.min(limit, 100));
        return catalogNovelRepository.findMissingCover(PageRequest.of(0, size))
            .stream()
            .map(this::toProgress)
            .toList();
    }

    public CatalogOverviewDTO buildCatalogOverview(int limit) {
        int size = Math.max(1, Math.min(limit, 50));
        long total = catalogNovelRepository.count();
        Page<CrawlCatalogNovelEntity> missingPage = catalogNovelRepository.findMissingCover(PageRequest.of(0, size));
        List<CatalogNovelProgressDTO> missing = missingPage.stream()
            .map(this::toProgress)
            .toList();
        List<CatalogNovelProgressDTO> recent = catalogNovelRepository
            .findByOwnerIdIsNullOrderByUpdatedAtDesc(PageRequest.of(0, size))
            .stream()
            .map(this::toProgress)
            .toList();
        return new CatalogOverviewDTO(total, missingPage.getTotalElements(), missing, List.of(), recent);
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
        publishCatalogIndexEvent(catalogNovelId, saved, title, sortOrder);
        return saved;
    }

    private void publishCatalogIndexEvent(
        String catalogNovelId,
        CrawlCatalogChapterEntity saved,
        String title,
        int sortOrder
    ) {
        IMessageProducer producer = messageProducerProvider.getIfAvailable();
        if (producer == null) {
            log.warn(
                "MQ 未配置，跳过书库章节索引事件 catalogNovelId={} chapterId={}",
                catalogNovelId,
                saved.getId()
            );
            return;
        }
        try {
            producer.send(
                MqTopic.CATALOG_INDEX,
                new CatalogIndexMessage(
                    catalogNovelId,
                    saved.getId(),
                    title == null ? "" : title,
                    sortOrder
                )
            );
            log.debug(
                "已发布书库章节索引事件 catalogNovelId={} chapterId={}",
                catalogNovelId,
                saved.getId()
            );
        } catch (Exception ex) {
            log.warn(
                "发送 CATALOG_INDEX 消息失败 catalogNovelId={} chapterId={}: {}",
                catalogNovelId,
                saved.getId(),
                ex.getMessage()
            );
        }
    }

    @Transactional
    public NovelDTO addToUserLibrary(Long userId, String catalogNovelId) {
        CrawlCatalogNovelEntity catalog = findCatalog(catalogNovelId);
        List<CrawlCatalogChapterEntity> chapters =
            catalogChapterRepository.findByCatalogNovelIdOrderBySortOrderAsc(catalogNovelId);
        if (chapters.isEmpty()) {
            throw NotFoundException.keyed(ResultCode.NOT_FOUND, "content.catalog.no_chapters");
        }
        NovelDTO novel = novelService.createNovel(
            userId,
            new CreateNovelRequest(
                catalog.getTitle(),
                catalog.getDescription() != null
                    ? catalog.getDescription()
                    : messages.get("content.catalog.from_source", catalog.getSourceUrl()),
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
        return listMissingCover(limit);
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
        return toProgress(findCatalog(catalogNovelId));
    }

    @Transactional
    public CatalogNovelDTO setCoverUrl(String catalogNovelId, String coverUrl) {
        CrawlCatalogNovelEntity entity = findCatalog(catalogNovelId);
        entity.setCoverUrl(coverUrl == null ? null : coverUrl.trim());
        return toDto(catalogNovelRepository.save(entity));
    }

    private CatalogNovelProgressDTO toProgress(CrawlCatalogNovelEntity novel) {
        int saved = novel.getChapterCount() == null ? 0 : novel.getChapterCount();
        return new CatalogNovelProgressDTO(
            novel.getId(),
            novel.getTitle(),
            novel.getAuthor(),
            novel.getDescription(),
            novel.getSourceUrl(),
            novel.getCoverUrl(),
            saved,
            null,
            saved,
            saved > 0,
            null,
            null,
            novel.getCreatedAt().toEpochMilli(),
            novel.getUpdatedAt().toEpochMilli()
        );
    }

    private CrawlCatalogNovelEntity findCatalog(String catalogNovelId) {
        return catalogNovelRepository.findById(catalogNovelId)
            .orElseThrow(() -> NotFoundException.keyed("content.catalog.work_not_found"));
    }

    public CrawlCatalogNovelEntity findCatalogEntity(String catalogNovelId) {
        return findCatalog(catalogNovelId);
    }

    public ReferencedBookDTO getReferencedBook(String catalogNovelId, Long userId) {
        CrawlCatalogNovelEntity novel = catalogNovelRepository.findById(catalogNovelId)
            .orElseThrow(() -> new IllegalArgumentException("书库条目不存在"));
        if (novel.getOwnerId() != null) {
            boolean owned = novel.getOwnerId().equals(userId);
            if (!owned) {
                owned = libraryCollectionRepository.existsByUserIdAndCatalogNovelId(userId, catalogNovelId);
            }
            if (!owned) {
                throw new IllegalArgumentException("无权引用该书");
            }
        }
        ReferencedBookDTO dto = new ReferencedBookDTO();
        dto.setCatalogNovelId(catalogNovelId);
        dto.setTitle(novel.getTitle());
        dto.setSummary(novel.getDescription());
        dto.setNamespace(novel.getIndexNamespace());
        dto.setIndexStatus(normalizeIndexStatus(novel.getIndexStatus()));
        dto.setChapterTitles(catalogChapterRepository
            .findByCatalogNovelIdOrderBySortOrderAsc(catalogNovelId).stream()
            .map(CrawlCatalogChapterEntity::getTitle)
            .toList());
        return dto;
    }

    @Transactional
    public void updateIndexStatus(String catalogNovelId, IndexStatus status) {
        CrawlCatalogNovelEntity novel = catalogNovelRepository.findById(catalogNovelId)
            .orElseThrow(() -> new IllegalArgumentException("书库条目不存在"));
        novel.setIndexStatus(status.wire());
        catalogNovelRepository.save(novel);
    }

    /**
     * 触发私人书库条目 RAG 重索引（owner 或收藏者；仅 pending/indexing/failed）。
     */
    @Transactional
    public LibraryReindexResultDTO reindexLibrary(Long userId, String catalogNovelId) {
        CrawlCatalogNovelEntity novel = findCatalog(catalogNovelId);
        assertLibraryAccess(userId, novel, catalogNovelId);

        IndexStatus current = IndexStatus.fromWire(novel.getIndexStatus());
        if (!current.canReindex()) {
            throw ValidationException.keyed(
                ResultCode.BAD_REQUEST,
                "content.catalog.reindex_not_allowed",
                current.wire()
            );
        }

        int chapters = novel.getChapterCount() == null ? 0 : novel.getChapterCount();
        if (chapters <= 0) {
            throw NotFoundException.keyed(ResultCode.NOT_FOUND, "content.catalog.no_chapters");
        }

        String namespace = resolveIndexNamespace(novel);
        novel.setIndexStatus(IndexStatus.PENDING.wire());
        catalogNovelRepository.save(novel);
        publishLibraryIndexEvent(catalogNovelId, userId, namespace, novel.getOwnerId());

        return new LibraryReindexResultDTO(catalogNovelId, IndexStatus.PENDING.wire());
    }

    private void assertLibraryAccess(Long userId, CrawlCatalogNovelEntity novel, String catalogNovelId) {
        boolean allowed = false;
        if (novel.getOwnerId() != null) {
            allowed = novel.getOwnerId().equals(userId)
                || libraryCollectionRepository.existsByUserIdAndCatalogNovelId(userId, catalogNovelId);
        } else {
            allowed = libraryCollectionRepository.existsByUserIdAndCatalogNovelId(userId, catalogNovelId);
        }
        if (!allowed) {
            throw ForbiddenException.keyed(ResultCode.FORBIDDEN, "content.catalog.library_access_denied");
        }
    }

    private String resolveIndexNamespace(CrawlCatalogNovelEntity novel) {
        if (novel.getIndexNamespace() != null && !novel.getIndexNamespace().isBlank()) {
            return novel.getIndexNamespace();
        }
        String namespace = novel.getOwnerId() != null
            ? "library:" + novel.getOwnerId() + ":" + novel.getId()
            : "catalog:" + novel.getId();
        novel.setIndexNamespace(namespace);
        return namespace;
    }

    private void publishLibraryIndexEvent(
        String catalogNovelId,
        Long requestUserId,
        String namespace,
        Long ownerId
    ) {
        IMessageProducer producer = messageProducerProvider.getIfAvailable();
        if (producer == null) {
            log.warn("MQ 未配置，跳过书库索引事件 catalogNovelId={}", catalogNovelId);
            return;
        }
        Long messageUserId = ownerId != null ? ownerId : requestUserId;
        try {
            producer.send(
                MqTopic.LIBRARY_INDEX,
                new LibraryIndexMessage(catalogNovelId, messageUserId, namespace)
            );
            log.debug("已发布书库索引事件 catalogNovelId={} namespace={}", catalogNovelId, namespace);
        } catch (Exception ex) {
            log.warn(
                "发送 LIBRARY_INDEX 消息失败 catalogNovelId={}: {}",
                catalogNovelId,
                ex.getMessage()
            );
        }
    }

    private static String normalizeIndexStatus(String raw) {
        return IndexStatus.normalizeWire(raw);
    }

    @Transactional
    public void updateSummary(String catalogNovelId, String summary) {
        CrawlCatalogNovelEntity novel = catalogNovelRepository.findById(catalogNovelId)
            .orElseThrow(() -> new IllegalArgumentException("书库条目不存在"));
        novel.setDescription(summary);
        catalogNovelRepository.save(novel);
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
            .orElseThrow(() -> NotFoundException.keyed("content.catalog.chapter_not_found"));
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
