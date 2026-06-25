package cn.novelstudio.module.billing.dto;

public record PlanOrderStatsResp(
    int total,
    int pending,
    int paid,
    int expired,
    int refunded
) {
    public static PlanOrderStatsResp empty() {
        return new PlanOrderStatsResp(0, 0, 0, 0, 0);
    }
}
