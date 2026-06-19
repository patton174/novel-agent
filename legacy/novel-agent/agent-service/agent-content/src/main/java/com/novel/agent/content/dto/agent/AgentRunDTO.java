package com.novel.agent.content.dto.agent;

import com.novel.agent.content.agent.AgentRunStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AgentRunDTO {
    private String id;
    private String sessionId;
    private Long userId;
    private String userMessageId;
    private String assistantMessageId;
    private AgentRunStatus status;
    private String mode;
    private String errorMessage;
    private String workerId;
    /** epoch millis (UTC) */
    private Long leaseExpiresAt;
    private Long startedAt;
    private Long completedAt;
    private Long createdAt;
    private Long updatedAt;
}
