package cn.novelstudio.module.billing.dto;

import java.util.List;
import java.util.Map;

public record PlatformUsageOverviewResp(
    long mrrCents,
    Map<String, Long> activeSubscriptions,
    long monthTokensTotal,
    long monthCostMicros,
    long monthRevenueMicros,
    List<ModelBreakdownItem> modelBreakdown
) {
    public record ModelBreakdownItem(String model, long tokens, long costMicros) {}
}
