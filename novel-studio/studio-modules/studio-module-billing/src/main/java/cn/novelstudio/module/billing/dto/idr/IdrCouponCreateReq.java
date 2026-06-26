package cn.novelstudio.module.billing.dto.idr;

import java.util.List;

public record IdrCouponCreateReq(
    String status,
    String scope,
    List<String> scopeItems,
    String policy,
    Double reduction,
    Double fixed,
    Integer discount,
    Double capped
) {
}
