package cn.novelstudio.module.billing.dto;

import java.util.List;

public record PlanCrmResp(
    long id,
    String code,
    String name,
    String description,
    Integer priceCents,
    String currency,
    Long monthlyTokenQuota,
    Integer monthlyRunQuota,
    Integer rateLimitRpm,
    boolean isActive,
    boolean isFeatured,
    int sortOrder,
    List<String> features
) {
}
