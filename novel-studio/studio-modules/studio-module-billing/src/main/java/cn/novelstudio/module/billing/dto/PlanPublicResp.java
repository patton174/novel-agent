package cn.novelstudio.module.billing.dto;

import java.util.List;

public record PlanPublicResp(
    String code,
    String name,
    String description,
    Integer priceCents,
    String currency,
    String priceLabel,
    String periodLabel,
    Long monthlyTokenQuota,
    Integer monthlyRunQuota,
    List<String> features,
    boolean highlight,
    String cta
) {
}
