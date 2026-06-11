package cn.novelstudio.module.billing.dto;

import java.util.Map;

public record UsageReportRequest(
    Long userId,
    String runId,
    String sessionId,
    String traceId,
    String eventType,
    String model,
    Integer inputTokens,
    Integer outputTokens,
    Integer cacheReadTokens,
    Integer cacheWriteTokens,
    Long totalCostMicros,
    String idempotencyKey,
    Map<String, Object> metadata
) {
}
