package com.novel.agent.billing.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record UserUsageCrmResp(
    long userId,
    String periodYyyyMm,
    String planCode,
    String planName,
    long tokensUsed,
    Long tokenQuota,
    int runsUsed,
    Integer runQuota,
    long costMicros,
    double percentUsed,
    List<UsageEventResp> recentEvents,
    List<QuotaOverrideSummary> activeOverrides
) {
    public record QuotaOverrideSummary(
        long id,
        long tokenBonus,
        int runBonus,
        String reason,
        Instant expiresAt
    ) {}
}
