package cn.novelstudio.module.billing.dto;

import java.util.List;
import java.util.Map;

public record UsageModelTrendsResp(
    List<String> models,
    List<UsageModelTrendPoint> points
) {
    public record UsageModelTrendPoint(
        String date,
        Map<String, Long> tokensByModel
    ) {
    }
}
