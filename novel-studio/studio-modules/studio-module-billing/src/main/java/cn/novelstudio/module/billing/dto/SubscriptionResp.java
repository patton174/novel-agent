package cn.novelstudio.module.billing.dto;

import java.time.Instant;

public record SubscriptionResp(
    String planCode,
    String planName,
    String status,
    Instant currentPeriodStart,
    Instant currentPeriodEnd
) {
}
