package cn.novelstudio.module.content.service.auth.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.module.content.dto.AppendMessageRequest;
import cn.novelstudio.module.content.dto.BatchDeleteSessionsRequest;
import cn.novelstudio.module.content.dto.ContentMessageDTO;
import cn.novelstudio.module.content.dto.SaveRunTraceRequest;
import cn.novelstudio.module.content.dto.SessionDTO;
import cn.novelstudio.module.content.dto.UpsertSessionRequest;
import cn.novelstudio.module.content.service.ContentSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AuthContentSessionBiz extends BaseBiz {

    private final ContentSessionService sessionService;

    public Result<List<SessionDTO>> list(String userId, int limit) {
        return ok(sessionService.listSessions(userId, limit));
    }

    public Result<SessionDTO> get(String userId, String sessionId) {
        SessionDTO session = sessionService.getSession(userId, sessionId);
        if (session == null) {
            throw NotFoundException.keyed(ResultCode.SESSION_NOT_FOUND, ResultCode.SESSION_NOT_FOUND.getMessageKey());
        }
        return ok(session);
    }

    public Result<Map<String, Object>> upsert(String userId, UpsertSessionRequest request) {
        sessionService.upsertSession(userId, request.sessionId(), request.title(), request.novelId());
        return ok(Map.of("ok", true));
    }

    public Result<Map<String, Object>> delete(String userId, String sessionId) {
        if (!sessionService.deleteSession(userId, sessionId)) {
            throw NotFoundException.keyed(ResultCode.SESSION_NOT_FOUND, ResultCode.SESSION_NOT_FOUND.getMessageKey());
        }
        return ok(Map.of("ok", true));
    }

    public Result<Map<String, Object>> batchDelete(String userId, BatchDeleteSessionsRequest request) {
        int deleted = 0;
        for (String sessionId : request.sessionIds()) {
            if (sessionService.deleteSession(userId, sessionId)) {
                deleted++;
            }
        }
        return ok(Map.of("ok", true, "deleted", deleted));
    }

    public Result<List<ContentMessageDTO>> listMessages(String userId, String sessionId, int limit) {
        return ok(sessionService.listMessages(userId, sessionId, limit));
    }

    public Result<Map<String, Object>> saveRunTrace(String userId, String sessionId, String runId, SaveRunTraceRequest request) {
        if (!runId.equals(request.runId())) {
            throw ValidationException.keyed("content.session.run_id_mismatch");
        }
        sessionService.saveRunTrace(userId, sessionId, runId, request.traceJson() == null ? "" : request.traceJson());
        return ok(Map.of("ok", true));
    }

    public Result<Map<String, Object>> appendMessage(String userId, String sessionId, AppendMessageRequest request) {
        if (!sessionId.equals(request.sessionId())) {
            throw ValidationException.keyed("content.session.session_mismatch");
        }
        sessionService.appendMessage(
            userId,
            sessionId,
            request.role(),
            request.content(),
            request.runId(),
            request.messageId(),
            request.mode()
        );
        return ok(Map.of("ok", true));
    }
}
