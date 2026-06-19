package com.novel.agent.billing.dto;

import java.util.List;

public record UsageTrendsResp(
    List<UsageTrendPoint> points
) {
    public record UsageTrendPoint(
        String date,
        long tokens,
        long costMicros
    ) {
    }
}
