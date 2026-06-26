package cn.novelstudio.module.content.service;

import cn.novelstudio.module.content.dto.ChapterDTO;
import cn.novelstudio.module.content.dto.ChapterRowDTO;
import cn.novelstudio.module.content.dto.ChapterReadSliceDTO;
import cn.novelstudio.module.content.dto.ChapterSearchHitDTO;
import cn.novelstudio.module.content.dto.ChapterSummaryDTO;
import cn.novelstudio.module.content.dto.CreateChapterRequest;
import cn.novelstudio.module.content.dto.ReindexStatusDTO;
import cn.novelstudio.module.content.dto.PatchChapterLinesRequest;
import cn.novelstudio.module.content.dto.UpdateChapterRequest;
import cn.novelstudio.module.content.entity.ChapterEntity;
import cn.novelstudio.module.content.entity.ChapterVersionEntity;
import cn.novelstudio.module.content.entity.VolumeEntity;
import cn.novelstudio.module.content.repository.ChapterRepository;
import cn.novelstudio.module.content.repository.NovelRepository;
import cn.novelstudio.module.content.repository.VolumeRepository;
import cn.novelstudio.module.content.support.ChapterLineEditSupport;
import cn.novelstudio.module.content.support.ContentExceptions;
import cn.novelstudio.module.content.support.ChapterReadStreamWriter;
import cn.novelstudio.platform.i18n.StudioMessages;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
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
    private final UserWritingActivityService writingActivityService;
    private final StudioMessages messages;

    @Transactional
    public List<ChapterSummaryDTO> listSummaries(Long userId, String novelId) {
        assertNovelOwned(userId, novelId);
        volumeService.ensureDefaultVolume(novelId);
        Map<String, String> volumeTitles = volumeRepository.findByNovelIdOrderBySortOrderAscCreatedAtAsc(novelId)
            .stream()
            .collect(Collectors.toMap(VolumeEntity::getId, VolumeEntity::getTitle, (a, b) -> a));
        return assignListIndex(chapterRepository.findByNovelIdOrderBySortOrderAscCreatedAtAsc(novelId)
            .stream()
            .map(entity -> toSummary(entity, volumeTitles.get(entity.getVolumeId())))
            .toList());
    }

    public List<ChapterSummaryDTO> listSummariesForNovel(String novelId) {
        volumeService.ensureDefaultVolume(novelId);
        Map<String, String> volumeTitles = volumeRepository.findByNovelIdOrderBySortOrderAscCreatedAtAsc(novelId)
            .stream()
            .collect(Collectors.toMap(VolumeEntity::getId, VolumeEntity::getTitle, (a, b) -> a));
        return assignListIndex(chapterRepository.findByNovelIdOrderBySortOrderAscCreatedAtAsc(novelId)
            .stream()
            .map(entity -> toSummary(entity, volumeTitles.get(entity.getVolumeId())))
            .toList());
    }

    /**
     * Resolve one chapter row by chapter_id, exact title, or 1-based listIndex.
     */
    public ChapterSummaryDTO resolveChapterRow(
        Long userId,
        String novelId,
        String chapterId,
        String title,
        Integer index
    ) {
        assertNovelOwned(userId, novelId);
        List<ChapterSummaryDTO> rows = listSummaries(userId, novelId);
        String cid = chapterId == null ? "" : chapterId.trim();
        if (!cid.isBlank()) {
            return rows.stream()
                .filter(row -> cid.equals(row.id()))
                .findFirst()
                .orElseThrow(() -> ContentExceptions.badRequest("content.chapter.resolve_not_found", cid));
        }
        if (index != null) {
            if (index < 1) {
                throw ContentExceptions.badRequest("content.chapter.index_min");
            }
            if (index > rows.size()) {
                throw ContentExceptions.badRequest("content.chapter.index_out_of_range", index, rows.size());
            }
            return rows.get(index - 1);
        }
        String want = title == null ? "" : title.trim();
        if (!want.isBlank()) {
            List<ChapterSummaryDTO> exact = rows.stream()
                .filter(row -> want.equals(row.title()))
                .toList();
            if (exact.size() == 1) {
                return exact.get(0);
            }
            if (exact.size() > 1) {
                throw ContentExceptions.badRequest("content.chapter.ambiguous_title", want);
            }
            throw ContentExceptions.badRequest("content.chapter.no_title_match", want);
        }
        throw ContentExceptions.badRequest("content.chapter.resolve_target_required");
    }

    public ChapterReadSliceDTO readChapterSliceByTarget(
        Long userId,
        String novelId,
        String chapterId,
        String title,
        Integer index,
        Integer offset,
        Integer limit
    ) {
        ChapterSummaryDTO row = resolveChapterRow(userId, novelId, chapterId, title, index);
        return readChapterSlice(userId, row.id(), offset, limit, row.listIndex());
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
        return readChapterSlice(userId, chapterId, offset, limit, null);
    }

    public ChapterReadSliceDTO readChapterSlice(
        Long userId,
        String chapterId,
        Integer offset,
        Integer limit,
        Integer listIndexHint
    ) {
        ChapterDTO chapter = getChapter(userId, chapterId);
        int listIndex = listIndexHint != null && listIndexHint > 0
            ? listIndexHint
            : findListIndex(userId, chapter.novelId(), chapterId);
        return readChapterSlice(userId, chapterId, offset, limit, listIndex);
    }

    public List<ChapterRowDTO> listChapterRows(Long userId, String novelId) {
        return listSummaries(userId, novelId).stream()
            .map(ChapterRowDTO::fromSummary)
            .toList();
    }

    private ChapterReadSliceDTO readChapterSlice(
        Long userId,
        String chapterId,
        Integer offset,
        Integer limit,
        int listIndex
    ) {
        ChapterReadStreamWriter.SliceView view = buildReadSliceView(userId, chapterId, offset, limit, listIndex);
        String text = formatNumberedLines(view.sliceLines(), view.offsetOut());
        if (view.hasMore() && view.nextOffset() != null) {
            text += readMoreFooter(view.totalLines(), view.returnedLines(), view.nextOffset());
        }
        return new ChapterReadSliceDTO(
            view.chapter().id(),
            view.listIndex(),
            view.chapter().title(),
            view.totalLines(),
            view.offsetOut(),
            view.returnedLines(),
            view.hasMore(),
            view.nextOffset(),
            text
        );
    }

    /**
     * Stream numbered chapter lines as NDJSON ({@code meta} / {@code delta} / {@code done}).
     */
    public void streamChapterReadSlice(
        Long userId,
        String chapterId,
        Integer offset,
        Integer limit,
        OutputStream out
    ) throws IOException {
        ChapterDTO chapter = getChapter(userId, chapterId);
        int listIndex = findListIndex(userId, chapter.novelId(), chapterId);
        ChapterReadStreamWriter.SliceView view = buildReadSliceView(userId, chapterId, offset, limit, listIndex);
        String footer = view.hasMore() && view.nextOffset() != null
            ? readMoreFooter(view.totalLines(), view.returnedLines(), view.nextOffset())
            : null;
        ChapterReadStreamWriter.write(out, view, footer);
    }

    public void streamChapterReadSliceByTarget(
        Long userId,
        String novelId,
        String chapterId,
        String title,
        Integer index,
        Integer offset,
        Integer limit,
        OutputStream out
    ) throws IOException {
        ChapterSummaryDTO row = resolveChapterRow(userId, novelId, chapterId, title, index);
        streamChapterReadSlice(userId, row.id(), offset, limit, out);
    }

    private ChapterReadStreamWriter.SliceView buildReadSliceView(
        Long userId,
        String chapterId,
        Integer offset,
        Integer limit,
        int listIndex
    ) {
        ChapterDTO chapter = getChapter(userId, chapterId);
        String content = chapter.content() == null ? "" : chapter.content();
        String[] allLines = ChapterLineEditSupport.splitContentLines(content);
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
        return new ChapterReadStreamWriter.SliceView(
            chapter,
            listIndex,
            slice,
            offsetOut,
            total,
            returned,
            hasMore,
            nextOffset
        );
    }

    private int findListIndex(Long userId, String novelId, String chapterId) {
        if (novelId == null || novelId.isBlank() || chapterId == null || chapterId.isBlank()) {
            return 0;
        }
        return listSummaries(userId, novelId).stream()
            .filter(row -> chapterId.equals(row.id()))
            .map(ChapterSummaryDTO::listIndex)
            .findFirst()
            .orElse(0);
    }

    private String toAgentMarkdown(ChapterDTO chapter, int listIndex) {
        String title = chapter.title() == null || chapter.title().isBlank()
            ? messages.get("content.chapter.untitled")
            : chapter.title();
        String cid = chapter.id() == null ? "" : chapter.id();
        int sortOrder = chapter.sortOrder();
        String summary = chapter.summary() == null ? "" : chapter.summary();
        String content = chapter.content() == null ? "" : chapter.content();
        StringBuilder sb = new StringBuilder();
        sb.append("---\n");
        sb.append("title: ").append(title).append('\n');
        sb.append("chapter_id: ").append(cid).append('\n');
        sb.append("list_index: ").append(listIndex).append('\n');
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
        recordWritingDeltaForNovel(saved.getNovelId(), 0, saved.getWordCount() == null ? 0 : saved.getWordCount());
        return toDto(saved);
    }

    @Transactional
    public ChapterDTO patchChapterLines(
        Long userId,
        String chapterId,
        PatchChapterLinesRequest request,
        String source
    ) {
        ChapterEntity entity = chapterRepository.findById(chapterId)
            .orElseThrow(ContentExceptions::chapterNotFound);
        assertNovelOwned(userId, entity.getNovelId());
        String current = entity.getContent() == null ? "" : entity.getContent();
        String updated = ChapterLineEditSupport.replaceLineRange(
            current,
            request.lineStart(),
            request.lineEnd(),
            request.lineContent()
        );
        return applyUpdate(entity, null, updated, null, null, source);
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
        int previousWords = entity.getWordCount() == null ? 0 : entity.getWordCount();
        ChapterEntity saved = chapterRepository.save(entity);
        indexClient.indexChapter(saved.getNovelId(), toDto(saved));
        int nextWords = saved.getWordCount() == null ? 0 : saved.getWordCount();
        recordWritingDeltaForNovel(saved.getNovelId(), previousWords, nextWords);
        return toDto(saved);
    }

    @Transactional
    /**
     * Delete a chapter idempotently. Returns {@code true} if a chapter was removed,
     * {@code false} if it was already absent (so a retried DELETE is not an error).
     */
    public boolean deleteChapter(Long userId, String chapterId) {
        ChapterEntity entity = chapterRepository.findById(chapterId).orElse(null);
        if (entity == null) {
            return false;
        }
        assertNovelOwned(userId, entity.getNovelId());
        indexClient.removeChapter(chapterId);
        chapterRepository.delete(entity);
        return true;
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
                throw ContentExceptions.badRequest("content.chapter.volume_novel_mismatch");
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
            throw ContentExceptions.badRequest("content.chapter.ids_required");
        }
        List<ChapterSummaryDTO> current = listSummaries(userId, novelId);
        java.util.Set<String> known = current.stream()
            .map(ChapterSummaryDTO::id)
            .collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new));
        java.util.Set<String> provided = new java.util.LinkedHashSet<>(chapterIds);
        if (provided.size() != chapterIds.size()) {
            throw ContentExceptions.badRequest("content.chapter.duplicate_ids");
        }
        if (!known.equals(provided)) {
            throw ContentExceptions.badRequest("content.chapter.ids_set_mismatch");
        }
        for (int i = 0; i < chapterIds.size(); i++) {
            ChapterEntity entity = chapterRepository.findById(chapterIds.get(i))
                .orElseThrow(ContentExceptions::chapterNotFound);
            if (!novelId.equals(entity.getNovelId())) {
                throw ContentExceptions.badRequest("content.chapter.not_in_novel");
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

    private void recordWritingDeltaForNovel(String novelId, int previousWords, int nextWords) {
        long delta = (long) nextWords - previousWords;
        if (delta <= 0) {
            return;
        }
        novelRepository.findById(novelId).ifPresent(novel ->
            writingActivityService.recordWordsAdded(novel.getUserId(), delta)
        );
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
            entity.getUpdatedAt().toEpochMilli(),
            0
        );
    }

    private static List<ChapterSummaryDTO> assignListIndex(List<ChapterSummaryDTO> rows) {
        List<ChapterSummaryDTO> out = new ArrayList<>(rows.size());
        for (int i = 0; i < rows.size(); i++) {
            ChapterSummaryDTO row = rows.get(i);
            out.add(new ChapterSummaryDTO(
                row.id(),
                row.novelId(),
                row.volumeId(),
                row.volumeTitle(),
                row.title(),
                row.summary(),
                row.sortOrder(),
                row.wordCount(),
                row.updatedAt(),
                i + 1
            ));
        }
        return out;
    }

    private String readMoreFooter(int totalLines, int returnedLines, int nextOffset) {
        return "\n\n" + messages.get("content.chapter.read_footer", totalLines, returnedLines, nextOffset);
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
