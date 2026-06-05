package com.novel.agent.content.service;

import com.novel.agent.content.dto.ChapterDTO;
import com.novel.agent.content.dto.ChapterReadSliceDTO;
import com.novel.agent.content.dto.ChapterSearchHitDTO;
import com.novel.agent.content.dto.ChapterSummaryDTO;
import com.novel.agent.content.dto.CreateChapterRequest;
import com.novel.agent.content.dto.ReindexStatusDTO;
import com.novel.agent.content.dto.UpdateChapterRequest;
import com.novel.agent.content.entity.ChapterEntity;
import com.novel.agent.content.entity.ChapterVersionEntity;
import com.novel.agent.content.entity.VolumeEntity;
import com.novel.agent.content.repository.ChapterRepository;
import com.novel.agent.content.repository.NovelRepository;
import com.novel.agent.content.repository.VolumeRepository;
import com.novel.agent.content.support.ContentExceptions;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChapterService {

    private final ChapterRepository chapterRepository;
    private final NovelRepository novelRepository;
    private final VolumeRepository volumeRepository;
    private final VolumeService volumeService;
    private final ChapterVersionService versionService;
    private final ChapterIndexClient indexClient;
    private final ReindexJobService reindexJobService;

    @Transactional
    public List<ChapterSummaryDTO> listSummaries(Long userId, String novelId) {
        assertNovelOwned(userId, novelId);
        volumeService.ensureDefaultVolume(novelId);
        Map<String, String> volumeTitles = volumeRepository.findByNovelIdOrderBySortOrderAscCreatedAtAsc(novelId)
            .stream()
            .collect(Collectors.toMap(VolumeEntity::getId, VolumeEntity::getTitle, (a, b) -> a));
        return chapterRepository.findByNovelIdOrderBySortOrderAscCreatedAtAsc(novelId)
            .stream()
            .map(entity -> toSummary(entity, volumeTitles.get(entity.getVolumeId())))
            .toList();
    }

    public ChapterDTO getChapter(Long userId, String chapterId) {
        ChapterEntity entity = chapterRepository.findById(chapterId)
            .orElseThrow(ContentExceptions::chapterNotFound);
        assertNovelOwned(userId, entity.getNovelId());
        if (entity.getVolumeId() == null || entity.getVolumeId().isBlank()) {
            VolumeEntity defaultVolume = volumeService.ensureDefaultVolume(entity.getNovelId());
            entity.setVolumeId(defaultVolume.getId());
            chapterRepository.save(entity);
        }
        return toDto(entity);
    }

    /**
     * Line-based read for Agent VFS Read (1-based offset; limit omitted = all lines from offset).
     */
    public ChapterReadSliceDTO readChapterSlice(
        Long userId,
        String chapterId,
        Integer offset,
        Integer limit
    ) {
        ChapterDTO chapter = getChapter(userId, chapterId);
        String markdown = toAgentMarkdown(chapter);
        String[] allLines = markdown.split("\\R", -1);
        int total = allLines.length;
        int start = offset == null || offset < 1 ? 0 : Math.min(offset - 1, total);
        int end = total;
        if (limit != null && limit > 0) {
            end = Math.min(total, start + limit);
        }
        String[] slice = java.util.Arrays.copyOfRange(allLines, start, end);
        int returned = slice.length;
        boolean hasMore = end < total;
        Integer nextOffset = hasMore ? end + 1 : null;
        int offsetOut = start + 1;
        String text = formatNumberedLines(slice, offsetOut);
        if (hasMore && nextOffset != null) {
            text += String.format(
                "%n%n[章节共 %d 行，本次 %d 行；续读 offset=%d limit=…]",
                total,
                returned,
                nextOffset
            );
        }
        return new ChapterReadSliceDTO(
            chapter.id(),
            chapter.title(),
            total,
            offsetOut,
            returned,
            hasMore,
            nextOffset,
            text
        );
    }

    private static String toAgentMarkdown(ChapterDTO chapter) {
        String title = chapter.title() == null ? "未命名" : chapter.title();
        String cid = chapter.id() == null ? "" : chapter.id();
        int sortOrder = chapter.sortOrder();
        String summary = chapter.summary() == null ? "" : chapter.summary();
        String content = chapter.content() == null ? "" : chapter.content();
        StringBuilder sb = new StringBuilder();
        sb.append("---\n");
        sb.append("title: ").append(title).append('\n');
        sb.append("chapter_id: ").append(cid).append('\n');
        sb.append("sort_order: ").append(sortOrder).append('\n');
        sb.append("---\n\n");
        if (!summary.isBlank() && !content.startsWith(summary)) {
            sb.append("<!-- summary: ").append(summary).append(" -->\n\n");
        }
        sb.append(content);
        return sb.toString();
    }

    private static String formatNumberedLines(String[] lines, int firstLineNumber) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < lines.length; i++) {
            sb.append(String.format("%6d\t%s%n", firstLineNumber + i, lines[i]));
        }
        return sb.toString().stripTrailing();
    }

    @Transactional
    public ChapterDTO createChapter(Long userId, String novelId, CreateChapterRequest request) {
        assertNovelOwned(userId, novelId);
        VolumeEntity volume = volumeService.resolveVolume(userId, novelId, request.volumeId());
        ChapterEntity entity = new ChapterEntity();
        entity.setNovelId(novelId);
        entity.setVolumeId(volume.getId());
        entity.setTitle(request.title().trim());
        entity.setContent(request.content() == null ? "" : request.content());
        entity.setSummary(request.summary());
        if (request.sortOrder() != null) {
            entity.setSortOrder(request.sortOrder());
        } else {
            entity.setSortOrder(chapterRepository.countByVolumeId(volume.getId()) + 1);
        }
        ChapterEntity saved = chapterRepository.save(entity);
        indexClient.indexChapter(saved.getNovelId(), toDto(saved));
        return toDto(saved);
    }

    @Transactional
    public ChapterDTO updateChapter(Long userId, String chapterId, UpdateChapterRequest request) {
        return updateChapter(userId, chapterId, request, "user");
    }

    @Transactional
    public ChapterDTO updateChapter(
        Long userId,
        String chapterId,
        UpdateChapterRequest request,
        String source
    ) {
        ChapterEntity entity = chapterRepository.findById(chapterId)
            .orElseThrow(ContentExceptions::chapterNotFound);
        assertNovelOwned(userId, entity.getNovelId());
        return applyUpdate(
            entity,
            request.title(),
            request.content(),
            request.summary(),
            request.sortOrder(),
            source
        );
    }

    @Transactional
    public ChapterDTO restoreVersion(Long userId, String chapterId, String versionId) {
        ChapterVersionEntity version = versionService.findOwnedVersion(userId, chapterId, versionId);
        ChapterEntity entity = chapterRepository.findById(chapterId)
            .orElseThrow(ContentExceptions::chapterNotFound);
        return applyUpdate(entity, version.getTitle(), version.getContent(), null, null, "restore");
    }

    private ChapterDTO applyUpdate(
        ChapterEntity entity,
        String title,
        String content,
        String summary,
        Integer sortOrder,
        String source
    ) {
        boolean contentChanged = content != null
            && !content.equals(entity.getContent() == null ? "" : entity.getContent());
        boolean titleChanged = title != null && !title.isBlank() && !title.equals(entity.getTitle());
        if (contentChanged || titleChanged) {
            versionService.snapshot(entity, source);
        }
        if (title != null && !title.isBlank()) {
            entity.setTitle(title.trim());
        }
        if (content != null) {
            entity.setContent(content);
        }
        if (summary != null) {
            entity.setSummary(summary);
        }
        if (sortOrder != null) {
            entity.setSortOrder(sortOrder);
        }
        ChapterEntity saved = chapterRepository.save(entity);
        indexClient.indexChapter(saved.getNovelId(), toDto(saved));
        return toDto(saved);
    }

    @Transactional
    public void deleteChapter(Long userId, String chapterId) {
        ChapterEntity entity = chapterRepository.findById(chapterId)
            .orElseThrow(ContentExceptions::chapterNotFound);
        assertNovelOwned(userId, entity.getNovelId());
        indexClient.removeChapter(chapterId);
        chapterRepository.delete(entity);
    }

    public List<ChapterSearchHitDTO> searchChapters(Long userId, String novelId, String query, int limit) {
        assertNovelOwned(userId, novelId);
        if (query == null || query.isBlank()) {
            return List.of();
        }
        int safeLimit = Math.max(1, Math.min(limit, 20));
        return chapterRepository.searchByNovelId(novelId, query.trim())
            .stream()
            .limit(safeLimit)
            .map(this::toSearchHit)
            .toList();
    }

    public ReindexStatusDTO reindexNovel(Long userId, String novelId) {
        assertNovelOwned(userId, novelId);
        if (reindexJobService.isRunning(novelId)) {
            return reindexJobService.getStatus(novelId);
        }
        List<ChapterDTO> chapters = chapterRepository.findByNovelIdOrderedWithVolumes(novelId)
            .stream()
            .map(this::toDto)
            .toList();
        ReindexStatusDTO status = reindexJobService.start(novelId, chapters.size());
        indexClient.reindexNovelAsync(novelId, chapters);
        return status;
    }

    public ReindexStatusDTO getReindexStatus(Long userId, String novelId) {
        assertNovelOwned(userId, novelId);
        return reindexJobService.getStatus(novelId);
    }

    @Transactional
    public List<ChapterSummaryDTO> reorderChaptersInVolume(Long userId, String volumeId, List<String> chapterIds) {
        VolumeEntity volume = volumeService.findOwnedVolumeEntity(userId, volumeId);
        String novelId = volume.getNovelId();
        for (int i = 0; i < chapterIds.size(); i++) {
            ChapterEntity entity = chapterRepository.findById(chapterIds.get(i))
                .orElseThrow(ContentExceptions::chapterNotFound);
            if (!novelId.equals(entity.getNovelId())) {
                throw ContentExceptions.badRequest("章节与卷不属于同一小说");
            }
            entity.setVolumeId(volumeId);
            entity.setSortOrder(i + 1);
            chapterRepository.save(entity);
        }
        return listSummaries(userId, novelId);
    }

    @Transactional
    public List<ChapterSummaryDTO> reorderNovelChapters(Long userId, String novelId, List<String> chapterIds) {
        assertNovelOwned(userId, novelId);
        if (chapterIds == null || chapterIds.isEmpty()) {
            throw ContentExceptions.badRequest("chapter_ids 不能为空");
        }
        for (int i = 0; i < chapterIds.size(); i++) {
            ChapterEntity entity = chapterRepository.findById(chapterIds.get(i))
                .orElseThrow(ContentExceptions::chapterNotFound);
            if (!novelId.equals(entity.getNovelId())) {
                throw ContentExceptions.badRequest("章节不属于该小说");
            }
            entity.setSortOrder(i + 1);
            chapterRepository.save(entity);
        }
        return listSummaries(userId, novelId);
    }

    private ChapterSearchHitDTO toSearchHit(ChapterEntity entity) {
        String content = entity.getContent() == null ? "" : entity.getContent();
        String snippet = buildSnippet(content, 160);
        if (snippet.isBlank() && entity.getSummary() != null) {
            snippet = entity.getSummary();
        }
        return new ChapterSearchHitDTO(
            entity.getId(),
            entity.getTitle(),
            snippet,
            entity.getSortOrder(),
            entity.getWordCount() == null ? 0 : entity.getWordCount()
        );
    }

    private static String buildSnippet(String content, int maxLen) {
        String compact = content.replaceAll("\\s+", " ").trim();
        if (compact.length() <= maxLen) {
            return compact;
        }
        return compact.substring(0, maxLen) + "…";
    }

    private void assertNovelOwned(Long userId, String novelId) {
        novelRepository.findByIdAndUserId(novelId, userId)
            .orElseThrow(ContentExceptions::novelNotFound);
    }

    private ChapterSummaryDTO toSummary(ChapterEntity entity, String volumeTitle) {
        return new ChapterSummaryDTO(
            entity.getId(),
            entity.getNovelId(),
            entity.getVolumeId(),
            volumeTitle,
            entity.getTitle(),
            entity.getSummary(),
            entity.getSortOrder(),
            entity.getWordCount() == null ? 0 : entity.getWordCount(),
            entity.getUpdatedAt().toEpochMilli()
        );
    }

    private ChapterDTO toDto(ChapterEntity entity) {
        return new ChapterDTO(
            entity.getId(),
            entity.getNovelId(),
            entity.getVolumeId(),
            entity.getTitle(),
            entity.getContent(),
            entity.getSummary(),
            entity.getSortOrder(),
            entity.getWordCount() == null ? 0 : entity.getWordCount(),
            entity.getCreatedAt().toEpochMilli(),
            entity.getUpdatedAt().toEpochMilli()
        );
    }
}
