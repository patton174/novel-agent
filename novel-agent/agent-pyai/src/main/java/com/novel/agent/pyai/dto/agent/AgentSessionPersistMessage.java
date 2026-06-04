package com.novel.agent.pyai.dto.agent;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AgentSessionPersistMessage(
    Long userId,
    String sessionId,
    String runId,
    String messageId,
    String mode,
    String userMessage,
    String assistantMessage,
    String status,
    String error
) {}
