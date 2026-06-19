package com.novel.agent.content.controller.auth;

import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.service.BaseController;
import com.novel.agent.content.dto.agent.AgentEventDTO;
import com.novel.agent.content.dto.agent.AgentRunDTO;
import com.novel.agent.content.service.auth.biz.AuthAgentRunBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/content/auth/agent")
@RequiredArgsConstructor
public class AuthAgentRunController extends BaseController {

    private final AuthAgentRunBiz biz;

    @GetMapping("/sessions/{sessionId}/active-run")
    public Result<AgentRunDTO> activeRun(
        @RequestHeader(name = "X-User-Id") String userIdHeader,
        @PathVariable String sessionId
    ) {
        return biz.activeRun(parseUserId(userIdHeader), sessionId);
    }

    @GetMapping("/runs/{runId}")
    public Result<AgentRunDTO> getRun(
        @RequestHeader(name = "X-User-Id") String userIdHeader,
        @PathVariable String runId
    ) {
        return biz.getRun(parseUserId(userIdHeader), runId);
    }

    @GetMapping("/runs/{runId}/events")
    public Result<List<AgentEventDTO>> listEvents(
        @RequestHeader(name = "X-User-Id") String userIdHeader,
        @PathVariable String runId,
        @RequestParam(name = "after_sequence", defaultValue = "-1") int afterSequence
    ) {
        return biz.listEvents(parseUserId(userIdHeader), runId, afterSequence);
    }

    @GetMapping("/runs/{runId}/timeline")
    public Result<List<AgentEventDTO>> timeline(
        @RequestHeader(name = "X-User-Id") String userIdHeader,
        @PathVariable String runId,
        @RequestParam(name = "after_sequence", defaultValue = "-1") int afterSequence
    ) {
        return biz.listEvents(parseUserId(userIdHeader), runId, afterSequence);
    }
}
