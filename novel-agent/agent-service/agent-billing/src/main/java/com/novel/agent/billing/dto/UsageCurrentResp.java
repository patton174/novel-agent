package com.novel.agent.billing.dto;

import java.time.Instant;

public record UsageCurrentResp(
    String periodYyyyMm,
    long tokensUsed,
    Long tokenQuota,
    int runsUsed,
    Integer runQuota,
    long costMicros,
    double percentUsed,
    boolean quotaWarning,
    String planCode,
    String planName,
    Instant periodEnd
) {
}
