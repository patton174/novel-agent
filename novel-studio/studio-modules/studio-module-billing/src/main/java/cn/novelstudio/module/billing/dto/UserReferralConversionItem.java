package cn.novelstudio.module.billing.dto;

import java.time.Instant;

public record UserReferralConversionItem(
    long id,
    String userLabel,
    Instant registeredAt,
    boolean converted
) {
}
