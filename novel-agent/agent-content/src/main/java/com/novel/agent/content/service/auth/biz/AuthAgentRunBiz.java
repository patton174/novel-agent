package com.novel.agent.content.service.auth.biz;

import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.content.dto.agent.AgentEventDTO;
import com.novel.agent.content.dto.agent.AgentRunDTO;
import com.novel.agent.content.service.agent.AgentRunService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class AuthAgentRunBiz extends BaseBiz {

    private final AgentRunService agentRunService;

    public Result<AgentRunDTO> activeRun(Long userId, String sessionId) {
        AgentRunDTO run = agentRunService.getActiveRunForSession(sessionId);
        if (run == null) {
            return ok(null);
        }
        requireRunOwner(userId, run);
        return ok(run);
    }

    public Result<AgentRunDTO> getRun(Long userId, String runId) {
        AgentRunDTO run = requireRun(runId);
        requireRunOwner(userId, run);
        return ok(run);
    }

    public Result<List<AgentEventDTO>> listEvents(Long userId, String runId, int afterSequence) {
        AgentRunDTO run = requireRun(runId);
        requireRunOwner(userId, run);
        return ok(agentRunService.listEvents(runId, afterSequence));
    }

    private AgentRunDTO requireRun(String runId) {
        AgentRunDTO run = agentRunService.getRun(runId);
        if (run == null) {
            notFound(ResultCode.AGENT_RUN_NOT_FOUND, "运行记录不存在");
        }
        return run;
    }

    private void requireRunOwner(Long userId, AgentRunDTO run) {
        requireOwner(userId, run.getUserId(), ResultCode.AGENT_RUN_FORBIDDEN, "无权访问该运行记录");
    }
}
