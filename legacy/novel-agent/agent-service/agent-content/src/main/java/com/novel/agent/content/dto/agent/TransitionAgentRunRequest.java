package com.novel.agent.content.dto.agent;

import com.novel.agent.content.agent.AgentRunStatus;
import lombok.Data;

@Data
public class TransitionAgentRunRequest {
    private AgentRunStatus status;
    private String errorMessage;
    private String workerId;
}
