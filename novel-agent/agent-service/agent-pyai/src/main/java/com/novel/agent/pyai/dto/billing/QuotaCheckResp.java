package com.novel.agent.pyai.dto.billing;

public record QuotaCheckResp(
    boolean allowed,
    long tokensUsed,
    Long tokenQuota,
    int runsUsed,
    Integer runQuota,
    String planCode,
    double percentUsed,
    boolean quotaWarning
) {
}
