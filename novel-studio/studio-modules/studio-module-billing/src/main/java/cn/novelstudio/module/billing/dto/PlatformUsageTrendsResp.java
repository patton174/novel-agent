package cn.novelstudio.module.billing.dto;

import java.util.List;

public record PlatformUsageTrendsResp(List<UsageTrendPoint> points) {

    public record UsageTrendPoint(String date, long tokens, long costMicros) {}
}
