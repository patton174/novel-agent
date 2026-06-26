package cn.novelstudio.module.billing.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record PlanCrmUpsertReq(
    @NotBlank(message = "{validation.billing.plan_code_required}") String code,
    @NotBlank(message = "{validation.billing.plan_name_required}") String name,
    String description,
    Integer priceCents,
    String currency,
    Long monthlyTokenQuota,
    Integer monthlyRunQuota,
    Integer rateLimitRpm,
    Boolean isFeatured,
    Integer sortOrder,
    List<String> features,
    String idrProjectId,
    String idrSkuId
) {
}
