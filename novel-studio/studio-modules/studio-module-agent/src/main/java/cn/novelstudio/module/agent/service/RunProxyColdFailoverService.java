package cn.novelstudio.module.agent.service;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.ForbiddenException;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.module.agent.client.ContentInternalClient;
import cn.novelstudio.module.content.agent.AgentRunStatus;
import cn.novelstudio.module.content.dto.agent.AgentRunDTO;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

/**
 * Owner Java lost: reclaim proxy, restore context from checkpoint, reopen Python SSE on new pod.
 */
@Service
public class RunProxyColdFailoverService {

    private final ContentInternalClient contentInternalClient;
    private final HostRunColdFailoverService hostRunColdFailoverService;

    public RunProxyColdFailoverService(
        ContentInternalClient contentInternalClient,
        HostRunColdFailoverService hostRunColdFailoverService
    ) {
        this.contentInternalClient = contentInternalClient;
        this.hostRunColdFailoverService = hostRunColdFailoverService;
    }

    public Flux<String> resumeAfterOwnerLoss(Long userId, String runId, int afterSequence) {
        AgentRunDTO run = requireRecoverableRun(userId, runId);
        return hostRunColdFailoverService.resumeWithDirectPython(userId, runId, afterSequence, run);
    }

    private AgentRunDTO requireRecoverableRun(Long userId, String runId) {
        AgentRunDTO run = contentInternalClient.getRun(runId);
        if (run == null) {
            throw NotFoundException.keyed(ResultCode.AGENT_RUN_NOT_FOUND, "result.content.agent_run_not_found");
        }
        if (userId == null || run.getUserId() == null || !userId.equals(run.getUserId())) {
            throw ForbiddenException.keyed(ResultCode.AGENT_RUN_FORBIDDEN, "result.content.agent_run_forbidden");
        }
        if (!isRecoverableStatus(run.getStatus())) {
            throw NotFoundException.keyed(ResultCode.NOT_FOUND, "agent.run.already_finished");
        }
        return run;
    }

    private static boolean isRecoverableStatus(AgentRunStatus status) {
        return status == AgentRunStatus.QUEUED
            || status == AgentRunStatus.RUNNING
            || status == AgentRunStatus.WAITING_USER;
    }
}
