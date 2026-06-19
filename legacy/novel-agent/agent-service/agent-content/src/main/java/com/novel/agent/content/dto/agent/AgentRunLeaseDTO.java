package com.novel.agent.content.dto.agent;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AgentRunLeaseDTO {
    private boolean acquired;
    private String runId;
    private String workerId;
    /** epoch millis (UTC) */
    private Long leaseExpiresAt;
    private String message;
}
