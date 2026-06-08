package com.novel.agent.billing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record PlanCrmUpsertReq(
    @NotBlank String code,
    @NotBlank String name,
    String description,
    Integer priceCents,
    String currency,
    Long monthlyTokenQuota,
    Integer monthlyRunQuota,
    Integer rateLimitRpm,
    Boolean isFeatured,
    Integer sortOrder,
    List<String> features
) {
}
