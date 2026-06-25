package cn.novelstudio.module.billing.dto.idr;

public record IdrCouponItemResp(
    String id,
    String status,
    String code,
    String policy,
    String scope
) {
}
