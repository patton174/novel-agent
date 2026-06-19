package cn.novelstudio.module.content.controller.auth;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import cn.novelstudio.module.content.dto.ChapterDTO;
import cn.novelstudio.module.content.dto.ChapterReadSliceDTO;
import cn.novelstudio.module.content.dto.ChapterRowDTO;
import cn.novelstudio.module.content.dto.ChapterSummaryDTO;
import cn.novelstudio.module.content.dto.CoverPromptRequest;
import cn.novelstudio.module.content.dto.CoverPromptResponse;
import cn.novelstudio.module.content.dto.GenerateCoverRequest;
import cn.novelstudio.module.content.dto.CreateChapterRequest;
import cn.novelstudio.module.content.dto.CreateNovelRequest;
import cn.novelstudio.module.content.dto.NovelDescriptionPromptRequest;
import cn.novelstudio.module.content.dto.NovelDescriptionPromptResponse;
import cn.novelstudio.module.content.dto.NovelDTO;
import cn.novelstudio.module.content.dto.ReindexStatusDTO;
import cn.novelstudio.module.content.dto.ReorderIdsRequest;
import cn.novelstudio.module.content.dto.SessionDTO;
import cn.novelstudio.module.content.dto.UpdateNovelRequest;
import cn.novelstudio.module.content.service.auth.biz.AuthNovelBiz;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.UncheckedIOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/content/auth/novels")
@RequiredArgsConstructor
public class AuthNovelController extends BaseController {

    private final AuthNovelBiz biz;

    @GetMapping
    public Result<List<NovelDTO>> list(@RequestHeader("X-User-Id") String userId) {
        return biz.list(parseUserId(userId));
    }

    @PostMapping
    public Result<NovelDTO> create(
        @RequestHeader("X-User-Id") String userId,
        @Valid @RequestBody CreateNovelRequest request
    ) {
        return biz.create(parseUserId(userId), request);
    }

    @PostMapping("/description/prompt")
    public Result<NovelDescriptionPromptResponse> suggestDescriptionPrompt(
        @RequestHeader("X-User-Id") String userId,
        @RequestBody(required = false) NovelDescriptionPromptRequest request
    ) {
        return biz.suggestDescriptionPrompt(request);
    }

    @GetMapping("/{novelId}")
    public Result<NovelDTO> get(@RequestHeader("X-User-Id") String userId, @PathVariable String novelId) {
        return biz.get(parseUserId(userId), novelId);
    }

    @PutMapping("/{novelId}")
    public Result<NovelDTO> update(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId,
        @Valid @RequestBody UpdateNovelRequest request
    ) {
        return biz.update(parseUserId(userId), novelId, request);
    }

    @PostMapping("/{novelId}/cover/prompt")
    public Result<CoverPromptResponse> suggestCoverPrompt(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId,
        @RequestBody(required = false) CoverPromptRequest request
    ) {
        String draft = request == null ? null : request.draft();
        return biz.suggestCoverPrompt(parseUserId(userId), novelId, draft);
    }

    @PostMapping("/{novelId}/cover/generate")
    public Result<NovelDTO> generateCover(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId,
        @RequestBody(required = false) GenerateCoverRequest request
    ) {
        String prompt = request == null ? null : request.prompt();
        return biz.generateCover(parseUserId(userId), novelId, prompt);
    }

    @GetMapping("/{novelId}/export/txt")
    public ResponseEntity<String> exportTxt(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId
    ) {
        var payload = biz.exportTxt(parseUserId(userId), novelId);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + payload.filename() + "\"")
            .contentType(MediaType.TEXT_PLAIN)
            .body(payload.body());
    }

    @GetMapping("/{novelId}/export/pdf")
    public ResponseEntity<String> exportPdf(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId
    ) {
        var payload = biz.exportPdf(parseUserId(userId), novelId);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + payload.filename() + "\"")
            .contentType(MediaType.TEXT_PLAIN)
            .body(payload.body());
    }

    @DeleteMapping("/{novelId}")
    public Result<Map<String, Object>> delete(@RequestHeader("X-User-Id") String userId, @PathVariable String novelId) {
        return biz.delete(parseUserId(userId), novelId);
    }

    @GetMapping("/{novelId}/chapters")
    public Result<List<ChapterSummaryDTO>> listChapters(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId
    ) {
        return biz.listChapters(parseUserId(userId), novelId);
    }

    @GetMapping("/{novelId}/chapters/rows")
    public Result<List<ChapterRowDTO>> listChapterRows(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId
    ) {
        return biz.listChapterRows(parseUserId(userId), novelId);
    }

    @GetMapping("/{novelId}/chapters/resolve")
    public Result<ChapterRowDTO> resolveChapterRow(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId,
        @RequestParam(required = false) String chapterId,
        @RequestParam(required = false) String title,
        @RequestParam(required = false) Integer index
    ) {
        return biz.resolveChapterRow(parseUserId(userId), novelId, chapterId, title, index);
    }

    @GetMapping("/{novelId}/chapters/read")
    public Result<ChapterReadSliceDTO> readChapterByTarget(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId,
        @RequestParam(required = false) String chapterId,
        @RequestParam(required = false) String title,
        @RequestParam(required = false) Integer index,
        @RequestParam(required = false) Integer offset,
        @RequestParam(required = false) Integer limit
    ) {
        return biz.readChapterByTarget(
            parseUserId(userId),
            novelId,
            chapterId,
            title,
            index,
            offset,
            limit
        );
    }

    @GetMapping(value = "/{novelId}/chapters/read/stream", produces = "application/x-ndjson")
    public ResponseEntity<StreamingResponseBody> readChapterByTargetStream(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId,
        @RequestParam(required = false) String chapterId,
        @RequestParam(required = false) String title,
        @RequestParam(required = false) Integer index,
        @RequestParam(required = false) Integer offset,
        @RequestParam(required = false) Integer limit
    ) {
        Long uid = parseUserId(userId);
        StreamingResponseBody body = outputStream -> {
            try {
                biz.readChapterByTargetStream(
                    uid, novelId, chapterId, title, index, offset, limit, outputStream
                );
            } catch (UncheckedIOException ex) {
                throw ex;
            }
        };
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("application/x-ndjson"))
            .header("Cache-Control", "no-cache")
            .header("Connection", "keep-alive")
            .header("X-Accel-Buffering", "no")
            .body(body);
    }

    @PostMapping("/{novelId}/chapters")
    public Result<ChapterDTO> createChapter(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId,
        @Valid @RequestBody CreateChapterRequest request
    ) {
        return biz.createChapter(parseUserId(userId), novelId, request);
    }

    @PostMapping("/{novelId}/chapters/reorder")
    public Result<List<ChapterSummaryDTO>> reorderChapters(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId,
        @Valid @RequestBody ReorderIdsRequest request
    ) {
        return biz.reorderChapters(parseUserId(userId), novelId, request.ids());
    }

    @PostMapping("/{novelId}/reindex")
    public Result<ReindexStatusDTO> reindex(@RequestHeader("X-User-Id") String userId, @PathVariable String novelId) {
        return biz.reindex(parseUserId(userId), novelId);
    }

    @GetMapping("/{novelId}/reindex/status")
    public Result<ReindexStatusDTO> reindexStatus(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId
    ) {
        return biz.reindexStatus(parseUserId(userId), novelId);
    }

    @GetMapping("/{novelId}/knowledge-graph")
    public Result<Map<String, Object>> knowledgeGraph(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId
    ) {
        return biz.knowledgeGraph(parseUserId(userId), novelId);
    }

    @GetMapping("/{novelId}/sessions")
    public Result<List<SessionDTO>> listSessions(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId,
        @RequestParam(defaultValue = "50") int limit
    ) {
        return biz.listSessions(userId, novelId, limit);
    }
}
