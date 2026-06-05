package com.novel.agent.content.dto.agent;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AgentRunLeaseDTO {
    private boolean acquired;
    private String runId;
    private String workerId;
    private Instant leaseExpiresAt;
    private String message;
}
