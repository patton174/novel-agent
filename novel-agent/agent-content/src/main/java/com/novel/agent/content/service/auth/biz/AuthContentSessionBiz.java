package com.novel.agent.content.service.auth.biz;

import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.content.dto.AppendMessageRequest;
import com.novel.agent.content.dto.BatchDeleteSessionsRequest;
import com.novel.agent.content.dto.ContentMessageDTO;
import com.novel.agent.content.dto.SaveRunTraceRequest;
import com.novel.agent.content.dto.SessionDTO;
import com.novel.agent.content.dto.UpsertSessionRequest;
import com.novel.agent.content.service.ContentSessionService;
import com.novel.agent.content.service.StoryMemoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AuthContentSessionBiz extends BaseBiz {

    private final ContentSessionService sessionService;
    private final StoryMemoryService storyMemoryService;

    public Result<List<SessionDTO>> list(String userId, int limit) {
        return ok(sessionService.listSessions(userId, limit));
    }

    public Result<SessionDTO> get(String userId, String sessionId) {
        SessionDTO session = sessionService.getSession(userId, sessionId);
        if (session == null) {
            notFound(ResultCode.SESSION_NOT_FOUND, "会话不存在");
        }
        return ok(session);
    }

    public Result<Map<String, Object>> upsert(String userId, UpsertSessionRequest request) {
        sessionService.upsertSession(userId, request.sessionId(), request.title(), request.novelId());
        return ok(Map.of("ok", true));
    }

    public Result<Map<String, Object>> delete(String userId, String sessionId) {
        if (!sessionService.deleteSession(userId, sessionId)) {
            notFound(ResultCode.SESSION_NOT_FOUND, "会话不存在");
        }
        storyMemoryService.purgeSessionMemory(userId, sessionId);
        return ok(Map.of("ok", true));
    }

    public Result<Map<String, Object>> batchDelete(String userId, BatchDeleteSessionsRequest request) {
        int deleted = 0;
        for (String sessionId : request.sessionIds()) {
            if (sessionService.deleteSession(userId, sessionId)) {
                storyMemoryService.purgeSessionMemory(userId, sessionId);
                deleted++;
            }
        }
        return ok(Map.of("ok", true, "deleted", deleted));
    }

    public Result<List<ContentMessageDTO>> listMessages(String userId, String sessionId, int limit) {
        return ok(sessionService.listMessages(userId, sessionId, limit));
    }

    public Result<Map<String, Object>> saveRunTrace(String userId, String sessionId, String runId, SaveRunTraceRequest request) {
        require(runId.equals(request.runId()), ResultCode.BAD_REQUEST, "runId mismatch");
        sessionService.saveRunTrace(userId, sessionId, runId, request.traceJson() == null ? "" : request.traceJson());
        return ok(Map.of("ok", true));
    }

    public Result<Map<String, Object>> appendMessage(String userId, String sessionId, AppendMessageRequest request) {
        require(sessionId.equals(request.sessionId()), ResultCode.BAD_REQUEST, "session mismatch");
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
