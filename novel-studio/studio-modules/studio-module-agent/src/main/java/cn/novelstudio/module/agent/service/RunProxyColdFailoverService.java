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
            throw new NotFoundException(ResultCode.AGENT_RUN_NOT_FOUND, "运行记录不存在");
        }
        if (userId == null || run.getUserId() == null || !userId.equals(run.getUserId())) {
            throw new ForbiddenException(ResultCode.AGENT_RUN_FORBIDDEN, "无权访问该运行记录");
        }
        if (!isRecoverableStatus(run.getStatus())) {
            throw new NotFoundException(ResultCode.NOT_FOUND, "运行已结束，无法冷恢复");
        }
        return run;
    }

    private static boolean isRecoverableStatus(AgentRunStatus status) {
        return status == AgentRunStatus.QUEUED
            || status == AgentRunStatus.RUNNING
            || status == AgentRunStatus.WAITING_USER;
    }
}
