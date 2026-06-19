package com.novel.agent.content.controller.auth;

import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.service.BaseController;
import com.novel.agent.content.dto.ChapterDTO;
import com.novel.agent.content.dto.ChapterSummaryDTO;
import com.novel.agent.content.dto.CoverPromptRequest;
import com.novel.agent.content.dto.CoverPromptResponse;
import com.novel.agent.content.dto.GenerateCoverRequest;
import com.novel.agent.content.dto.CreateChapterRequest;
import com.novel.agent.content.dto.CreateNovelRequest;
import com.novel.agent.content.dto.NovelDescriptionPromptRequest;
import com.novel.agent.content.dto.NovelDescriptionPromptResponse;
import com.novel.agent.content.dto.NovelDTO;
import com.novel.agent.content.dto.ReindexStatusDTO;
import com.novel.agent.content.dto.ReorderIdsRequest;
import com.novel.agent.content.dto.SessionDTO;
import com.novel.agent.content.dto.UpdateNovelRequest;
import com.novel.agent.content.service.auth.biz.AuthNovelBiz;
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
        String title = request == null ? null : request.title();
        String genre = request == null ? null : request.genre();
        String style = request == null ? null : request.style();
        String draft = request == null ? null : request.draft();
        return biz.suggestDescriptionPrompt(title, genre, style, draft);
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

    @GetMapping("/{novelId}/sessions")
    public Result<List<SessionDTO>> listSessions(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId,
        @RequestParam(defaultValue = "50") int limit
    ) {
        return biz.listSessions(userId, novelId, limit);
    }
}
