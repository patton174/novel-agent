package cn.novelstudio.module.billing.dto;

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
