package cn.novelstudio.module.content.service.internal;

import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.content.dto.agent.*;
import cn.novelstudio.module.content.service.agent.AgentRunService;
import cn.novelstudio.module.content.service.agent.AgentSessionPgService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * internal agent API 业务层。鉴权由 {@link cn.novelstudio.module.content.config.InternalServiceKeyInterceptor} 统一处理。
 */
@Component
@RequiredArgsConstructor
public class InternalAgentRunBiz extends BaseBiz {

    private final AgentRunService agentRunService;
    private final AgentSessionPgService agentSessionPgService;

    public AgentRunDTO createRun(CreateAgentRunRequest request) {
        return agentRunService.createRun(request);
    }

    public ResponseEntity<AgentRunDTO> getRun(String runId) {
        AgentRunDTO run = agentRunService.getRun(runId);
        return run == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(run);
    }

    public AgentRunDTO getActiveRunForSession(String sessionId) {
        return agentRunService.getActiveRunForSession(sessionId);
    }

    public AgentRunDTO transition(String runId, TransitionAgentRunRequest request) {
        return agentRunService.transition(runId, request);
    }

    public AgentRunLeaseDTO lease(String runId, AgentRunLeaseRequest request) {
        return agentRunService.tryLease(runId, request.getWorkerId());
    }

    public AgentRunLeaseDTO renewLease(String runId, AgentRunLeaseRequest request) {
        return agentRunService.renewLease(runId, request.getWorkerId());
    }

    public void releaseLease(String runId, String workerId) {
        agentRunService.releaseLease(runId, workerId);
    }

    public AgentEventDTO appendEvent(String runId, AppendAgentEventRequest request) {
        return agentRunService.appendEvent(runId, request);
    }

    public List<AgentEventDTO> listEvents(String runId, int afterSequence) {
        return agentRunService.listEvents(runId, afterSequence);
    }

    public AgentCommandDTO recordCommand(String runId, RecordAgentCommandRequest request) {
        return agentRunService.recordCommand(runId, request);
    }

    public ResponseEntity<AgentCheckpointDTO> getCheckpoint(String runId) {
        AgentCheckpointDTO dto = agentRunService.getCheckpoint(runId);
        return dto == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(dto);
    }

    public AgentCheckpointDTO upsertCheckpoint(String runId, UpsertAgentCheckpointRequest request) {
        return agentRunService.upsertCheckpoint(runId, request);
    }

    public ResponseEntity<AgentCommandDTO> getCommand(String runId, String commandId) {
        AgentCommandDTO cmd = agentRunService.getCommand(runId, commandId);
        return cmd == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(cmd);
    }

    public void upsertSession(String sessionId, Map<String, Object> body) {
        Long userId = longVal(body.get("userId"));
        String title = stringVal(body.get("title"));
        String novelId = stringVal(body.get("novelId"));
        agentSessionPgService.upsertSession(userId, sessionId, title, novelId);
    }

    private static Long longVal(Object raw) {
        if (raw == null) {
            return null;
        }
        return Long.parseLong(String.valueOf(raw));
    }

    private static String stringVal(Object raw) {
        return raw == null ? null : String.valueOf(raw);
    }
}
