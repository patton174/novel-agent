package cn.novelstudio.module.content.dto.agent;

import lombok.Data;

@Data
public class CreateAgentRunRequest {
    private String runId;
    private String sessionId;
    private Long userId;
    private String userMessageId;
    private String assistantMessageId;
    private String userMessageContent;
    private String mode;
}
