package cn.novelstudio.module.content.dto.agent;

import cn.novelstudio.module.content.agent.AgentRunStatus;
import lombok.Data;

@Data
public class TransitionAgentRunRequest {
    private AgentRunStatus status;
    private String errorMessage;
    private String workerId;
}
