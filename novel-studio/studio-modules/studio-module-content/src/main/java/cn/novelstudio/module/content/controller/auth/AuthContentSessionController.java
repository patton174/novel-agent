package cn.novelstudio.module.content.controller.auth;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import cn.novelstudio.module.content.dto.AppendMessageRequest;
import cn.novelstudio.module.content.dto.BatchDeleteSessionsRequest;
import cn.novelstudio.module.content.dto.ContentMessageDTO;
import cn.novelstudio.module.content.dto.SaveRunTraceRequest;
import cn.novelstudio.module.content.dto.SessionDTO;
import cn.novelstudio.module.content.dto.UpsertSessionRequest;
import cn.novelstudio.module.content.service.auth.biz.AuthContentSessionBiz;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
@RequestMapping("/api/content/auth/sessions")
@RequiredArgsConstructor
public class AuthContentSessionController extends BaseController {

    private final AuthContentSessionBiz biz;

    @GetMapping
    public Result<List<SessionDTO>> list(
        @RequestHeader("X-User-Id") String userId,
        @RequestParam(defaultValue = "50") int limit
    ) {
        return biz.list(userId, limit);
    }

    @GetMapping("/{sessionId}")
    public Result<SessionDTO> get(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String sessionId
    ) {
        return biz.get(userId, sessionId);
    }

    @PostMapping("/upsert")
    public Result<Map<String, Object>> upsert(
        @RequestHeader("X-User-Id") String userId,
        @Valid @RequestBody UpsertSessionRequest request
    ) {
        return biz.upsert(userId, request);
    }

    @DeleteMapping("/{sessionId}")
    public Result<Map<String, Object>> delete(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String sessionId
    ) {
        return biz.delete(userId, sessionId);
    }

    @PostMapping("/batch-delete")
    public Result<Map<String, Object>> batchDelete(
        @RequestHeader("X-User-Id") String userId,
        @Valid @RequestBody BatchDeleteSessionsRequest request
    ) {
        return biz.batchDelete(userId, request);
    }

    @GetMapping("/{sessionId}/messages")
    public Result<List<ContentMessageDTO>> listMessages(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String sessionId,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return biz.listMessages(userId, sessionId, limit);
    }

    @PutMapping("/{sessionId}/runs/{runId}/trace")
    public Result<Map<String, Object>> saveRunTrace(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String sessionId,
        @PathVariable String runId,
        @Valid @RequestBody SaveRunTraceRequest request
    ) {
        return biz.saveRunTrace(userId, sessionId, runId, request);
    }

    @PostMapping("/{sessionId}/messages")
    public Result<Map<String, Object>> appendMessage(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String sessionId,
        @Valid @RequestBody AppendMessageRequest request
    ) {
        return biz.appendMessage(userId, sessionId, request);
    }
}
