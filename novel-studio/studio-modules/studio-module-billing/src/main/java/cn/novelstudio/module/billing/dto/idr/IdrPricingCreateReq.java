package cn.novelstudio.module.billing.dto.idr;

import java.util.List;

public record IdrPricingCreateReq(
    String status,
    String scope,
    List<String> scopeItems,
    String policy,
    String price
) {
}
