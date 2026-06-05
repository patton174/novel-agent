package com.novel.agent.content.dto.agent;

import com.novel.agent.content.agent.AgentRunStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

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
    private Instant leaseExpiresAt;
    private Instant startedAt;
    private Instant completedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
