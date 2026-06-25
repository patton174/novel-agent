package cn.novelstudio.module.billing.dto.idr;

public record IdrPricingItemResp(
    String id,
    String status,
    String scope,
    String policy,
    Double price
) {
}
