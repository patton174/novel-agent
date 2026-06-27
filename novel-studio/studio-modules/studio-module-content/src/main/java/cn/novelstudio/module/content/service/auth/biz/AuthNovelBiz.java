package cn.novelstudio.module.content.service.auth.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.content.dto.ChapterDTO;
import cn.novelstudio.module.content.dto.ChapterReadSliceDTO;
import cn.novelstudio.module.content.dto.ChapterRowDTO;
import cn.novelstudio.module.content.dto.ChapterSummaryDTO;
import cn.novelstudio.module.content.dto.CoverPromptResponse;
import cn.novelstudio.module.content.dto.CreateChapterRequest;
import cn.novelstudio.module.content.dto.CreateNovelRequest;
import cn.novelstudio.module.content.dto.NovelDescriptionPromptRequest;
import cn.novelstudio.module.content.dto.NovelDescriptionPromptResponse;
import cn.novelstudio.module.content.dto.NovelDTO;
import cn.novelstudio.module.content.dto.ReindexStatusDTO;
import cn.novelstudio.module.content.dto.SessionDTO;
import cn.novelstudio.module.content.dto.UpdateNovelRequest;
import cn.novelstudio.module.content.service.ChapterService;
import cn.novelstudio.module.content.service.ContentSessionService;
import cn.novelstudio.module.content.service.NovelCoverService;
import cn.novelstudio.module.content.service.NovelDescriptionClient;
import cn.novelstudio.module.content.service.NovelExportService;
import cn.novelstudio.module.content.service.KgBackfillService;
import cn.novelstudio.module.content.service.KgService;
import cn.novelstudio.module.content.service.KnowledgeGraphClient;
import cn.novelstudio.module.content.service.NovelService;
import cn.novelstudio.platform.messaging.constant.MqTopic;
import cn.novelstudio.platform.messaging.kg.KgBackfillMessage;
import cn.novelstudio.platform.messaging.producer.IMessageProducer;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AuthNovelBiz extends BaseBiz {

    private final NovelService novelService;
    private final NovelCoverService novelCoverService;
    private final NovelDescriptionClient novelDescriptionClient;
    private final NovelExportService novelExportService;
    private final ChapterService chapterService;
    private final ContentSessionService sessionService;
    private final KnowledgeGraphClient knowledgeGraphClient;
    private final KgBackfillService kgBackfillService;
    private final KgService kgService;
    private final ObjectProvider<IMessageProducer> producerProvider;

    public Result<List<NovelDTO>> list(Long userId) {
        return ok(novelService.listNovels(userId));
    }

    public Result<NovelDTO> create(Long userId, CreateNovelRequest request) {
        return ok(novelService.createNovel(userId, request));
    }

    public Result<NovelDTO> get(Long userId, String novelId) {
        return ok(novelService.getNovel(userId, novelId));
    }

    public Result<NovelDTO> update(Long userId, String novelId, UpdateNovelRequest request) {
        return ok(novelService.updateNovel(userId, novelId, request));
    }

    public Result<NovelDTO> generateCover(
        Long userId,
        String novelId,
        String prompt,
        String stylePrompt,
        String scenePrompt
    ) {
        return ok(novelCoverService.generateCover(userId, novelId, prompt, stylePrompt, scenePrompt));
    }

    public Result<CoverPromptResponse> suggestCoverPrompt(
        Long userId,
        String novelId,
        String styleDraft,
        String sceneDraft,
        String draft,
        String mode
    ) {
        return ok(novelCoverService.suggestCoverPrompt(userId, novelId, styleDraft, sceneDraft, draft, mode));
    }

    public void streamCoverPrompt(
        Long userId,
        String novelId,
        String styleDraft,
        String sceneDraft,
        String draft,
        String mode,
        OutputStream outputStream
    ) {
        novelCoverService.streamCoverPrompt(userId, novelId, styleDraft, sceneDraft, draft, mode, outputStream);
    }

    public Result<NovelDescriptionPromptResponse> suggestDescriptionPrompt(
        NovelDescriptionPromptRequest request
    ) {
        return ok(novelDescriptionClient.suggestDescription(request));
    }

    public NovelExportService.ExportPayload exportTxt(Long userId, String novelId) {
        return novelExportService.exportTxt(userId, novelId);
    }

    public NovelExportService.ExportPayload exportPdf(Long userId, String novelId) {
        return novelExportService.exportPdf(userId, novelId);
    }

    public Result<Map<String, Object>> delete(Long userId, String novelId) {
        novelService.deleteNovel(userId, novelId);
        return ok(Map.of("ok", true));
    }

    public Result<List<ChapterSummaryDTO>> listChapters(Long userId, String novelId) {
        return ok(chapterService.listSummaries(userId, novelId));
    }

    public Result<List<ChapterRowDTO>> listChapterRows(Long userId, String novelId) {
        return ok(chapterService.listChapterRows(userId, novelId));
    }

    public Result<ChapterRowDTO> resolveChapterRow(
        Long userId,
        String novelId,
        String chapterId,
        String title,
        Integer index
    ) {
        return ok(ChapterRowDTO.fromSummary(
            chapterService.resolveChapterRow(userId, novelId, chapterId, title, index)
        ));
    }

    public Result<ChapterReadSliceDTO> readChapterByTarget(
        Long userId,
        String novelId,
        String chapterId,
        String title,
        Integer index,
        Integer offset,
        Integer limit
    ) {
        return ok(chapterService.readChapterSliceByTarget(
            userId, novelId, chapterId, title, index, offset, limit
        ));
    }

    public void readChapterByTargetStream(
        Long userId,
        String novelId,
        String chapterId,
        String title,
        Integer index,
        Integer offset,
        Integer limit,
        OutputStream out
    ) {
        try {
            chapterService.streamChapterReadSliceByTarget(
                userId, novelId, chapterId, title, index, offset, limit, out
            );
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    public Result<ChapterDTO> createChapter(Long userId, String novelId, CreateChapterRequest request) {
        return ok(chapterService.createChapter(userId, novelId, request));
    }

    public Result<List<ChapterSummaryDTO>> reorderChapters(Long userId, String novelId, List<String> ids) {
        return ok(chapterService.reorderNovelChapters(userId, novelId, ids));
    }

    public Result<ReindexStatusDTO> reindex(Long userId, String novelId) {
        return ok(chapterService.reindexNovel(userId, novelId));
    }

    public Result<ReindexStatusDTO> reindexStatus(Long userId, String novelId) {
        return ok(chapterService.getReindexStatus(userId, novelId));
    }

    public Result<Map<String, Object>> knowledgeGraph(Long userId, String novelId) {
        novelService.getNovel(userId, novelId);
        return ok(knowledgeGraphClient.getNovelGraph(novelId));
    }

    public Result<Map<String, Object>> backfillKg(Long userId, String novelId) {
        novelService.getNovel(userId, novelId);
        Map<String, Object> graph = knowledgeGraphClient.getNovelGraph(novelId);
        if (!"empty".equals(graph.get("status"))) {
            return ok(Map.of("status", "exists"));
        }
        Map<String, Object> prog = kgBackfillService.getProgress(novelId);
        if ("in_progress".equals(prog.get("status"))) {
            return ok(Map.of("status", "in_progress"));
        }
        IMessageProducer producer = producerProvider.getIfAvailable();
        if (producer != null) {
            producer.send(MqTopic.KG_BACKFILL, new KgBackfillMessage(novelId, userId));
            return ok(Map.of("status", "started"));
        }
        kgBackfillService.backfill(novelId);
        return ok(Map.of("status", "started_sync"));
    }

    public Result<Map<String, Object>> kgProgress(Long userId, String novelId) {
        novelService.getNovel(userId, novelId);
        return ok(kgBackfillService.getProgress(novelId));
    }

    public Result<List<Map<String, Object>>> kgErrors(Long userId, String novelId) {
        novelService.getNovel(userId, novelId);
        return ok(kgService.recentErrors(novelId).stream().map(e -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("chapterId", e.getChapterId());
            m.put("reason", e.getReason());
            m.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toEpochMilli());
            return m;
        }).toList());
    }

    public Result<List<SessionDTO>> listSessions(String userId, String novelId, int limit) {
        return ok(sessionService.listSessionsByNovel(userId, novelId, limit));
    }
}
