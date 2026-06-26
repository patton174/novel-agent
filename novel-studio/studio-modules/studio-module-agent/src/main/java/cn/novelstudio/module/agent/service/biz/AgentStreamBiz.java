package cn.novelstudio.module.agent.service.biz;

import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.module.agent.client.ContentInternalClient;
import cn.novelstudio.module.agent.dto.agent.AgentStreamRequest;
import cn.novelstudio.module.agent.orchestration.AgentRunEventJournal;
import cn.novelstudio.module.agent.service.AgentBridgeService;
import cn.novelstudio.module.agent.service.RunProxyResumeService;
import cn.novelstudio.module.agent.support.AgentStreamSupport;
import cn.novelstudio.module.content.dto.agent.AgentRunDTO;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

@Component
public class AgentStreamBiz extends BaseBiz {

    private final AgentBridgeService agentBridgeService;
    private final RunProxyResumeService runProxyResumeService;
    private final AgentRunEventJournal eventJournal;
    private final ContentInternalClient contentInternalClient;

    public AgentStreamBiz(
        AgentBridgeService agentBridgeService,
        RunProxyResumeService runProxyResumeService,
        AgentRunEventJournal eventJournal,
        ContentInternalClient contentInternalClient
    ) {
        this.agentBridgeService = agentBridgeService;
        this.runProxyResumeService = runProxyResumeService;
        this.eventJournal = eventJournal;
        this.contentInternalClient = contentInternalClient;
    }

    public record StreamFrames(Flux<String> frames, String quotaWarningHeader) {}

    public StreamFrames streamFrames(Long userId, AgentStreamRequest request, boolean contentOnly) {
        String resumeRunId = resolveResumeRunId(userId, request);
        if (resumeRunId != null) {
            int afterSequence = request.afterSequence() == null ? -1 : request.afterSequence();
            return resumeRunStreamFrames(userId, resumeRunId, afterSequence, contentOnly);
        }
        if (request.message() == null || request.message().isBlank()) {
            throw ValidationException.keyed("agent.stream.message_required");
        }
        Flux<String> frames = agentBridgeService.stream(userId, request)
            .filter(frame -> !contentOnly || AgentStreamSupport.isContentFrame(frame));
        return new StreamFrames(AgentStreamSupport.withKeepalive(frames), null);
    }

    /**
     * 重连：显式 runId，或空 message + sessionId（查活跃 run）。
     */
    private String resolveResumeRunId(Long userId, AgentStreamRequest request) {
        if (request.runId() != null && !request.runId().isBlank()) {
            return request.runId().trim();
        }
        boolean blankMessage = request.message() == null || request.message().isBlank();
        String sessionId = request.sessionId();
        if (!blankMessage || sessionId == null || sessionId.isBlank()) {
            return null;
        }
        String fromJournal = eventJournal.activeRunId(userId, sessionId);
        if (fromJournal != null && !fromJournal.isBlank()) {
            return fromJournal;
        }
        AgentRunDTO active = contentInternalClient.getActiveRunForSession(sessionId);
        if (active == null || active.getId() == null || active.getId().isBlank()) {
            throw ValidationException.keyed(ResultCode.BAD_REQUEST, "agent.stream.no_resumable_run");
        }
        return active.getId();
    }

    public StreamFrames resumeRunStreamFrames(Long userId, String runId, int afterSequence, boolean contentOnly) {
        return runProxyResumeService.resume(userId, runId, afterSequence, contentOnly);
    }
}
