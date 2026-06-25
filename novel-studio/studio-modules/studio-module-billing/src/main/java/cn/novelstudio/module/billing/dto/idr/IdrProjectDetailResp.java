package cn.novelstudio.module.billing.dto.idr;

import java.util.List;

public record IdrProjectDetailResp(
    IdrProjectItemResp project,
    List<IdrSkuItemResp> skus,
    List<IdrPricingItemResp> pricings,
    List<IdrCouponItemResp> coupons
) {
}
