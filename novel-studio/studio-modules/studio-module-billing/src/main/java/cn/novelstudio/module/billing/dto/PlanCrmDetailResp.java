package cn.novelstudio.module.billing.dto;

import java.util.List;

public record PlanCrmDetailResp(
    PlanCrmResp plan,
    boolean paymentReady,
    PlanOrderStatsResp orderStats,
    List<PaymentOrderCrmResp> recentOrders
) {
}
