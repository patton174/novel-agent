package cn.novelstudio.module.agent.client;

import cn.novelstudio.module.content.agent.AgentRunStatus;
import cn.novelstudio.module.content.dto.agent.AgentEventDTO;
import cn.novelstudio.module.content.dto.agent.AgentRunDTO;
import cn.novelstudio.module.content.dto.agent.CreateAgentRunRequest;
import cn.novelstudio.module.content.dto.agent.RecordAgentCommandRequest;
import cn.novelstudio.module.content.dto.agent.TransitionAgentRunRequest;
import cn.novelstudio.module.content.service.internal.InternalAgentRunBiz;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ContentInternalClient {

    private final InternalAgentRunBiz internalAgentRunBiz;

    public ContentInternalClient(InternalAgentRunBiz internalAgentRunBiz) {
        this.internalAgentRunBiz = internalAgentRunBiz;
    }

    public void createRun(
        String runId,
        String sessionId,
        Long userId,
        String userMessageId,
        String assistantMessageId,
        String userMessageContent,
        String mode
    ) {
        CreateAgentRunRequest request = new CreateAgentRunRequest();
        request.setRunId(runId);
        request.setSessionId(sessionId);
        request.setUserId(userId);
        request.setUserMessageId(userMessageId);
        request.setAssistantMessageId(assistantMessageId);
        request.setUserMessageContent(userMessageContent == null ? "" : userMessageContent);
        request.setMode(mode == null ? "auto" : mode);
        internalAgentRunBiz.createRun(request);
    }

    public void transitionRun(String runId, String status, String errorMessage) {
        TransitionAgentRunRequest request = new TransitionAgentRunRequest();
        request.setStatus(AgentRunStatus.valueOf(status));
        request.setErrorMessage(errorMessage == null ? "" : errorMessage);
        internalAgentRunBiz.transition(runId, request);
    }

    public AgentRunDTO getRun(String runId) {
        ResponseEntity<AgentRunDTO> response = internalAgentRunBiz.getRun(runId);
        return response == null ? null : response.getBody();
    }

    public List<AgentEventDTO> listEvents(String runId, int afterSequence) {
        return internalAgentRunBiz.listEvents(runId, afterSequence);
    }

    public void recordCommand(String runId, String commandId, String commandType, String payloadJson) {
        RecordAgentCommandRequest request = new RecordAgentCommandRequest();
        request.setCommandId(commandId);
        request.setCommandType(commandType == null ? "interaction.submit" : commandType);
        request.setPayloadJson(payloadJson == null ? "{}" : payloadJson);
        internalAgentRunBiz.recordCommand(runId, request);
    }
}
