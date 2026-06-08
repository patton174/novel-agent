package com.novel.agent.billing.dto;

import java.time.Instant;
import java.util.Map;

public record UsageEventResp(
    Long id,
    String runId,
    String sessionId,
    String traceId,
    String eventType,
    String model,
    int inputTokens,
    int outputTokens,
    long totalTokens,
    long totalCostMicros,
    Instant createdAt,
    Map<String, Object> metadata
) {
}
