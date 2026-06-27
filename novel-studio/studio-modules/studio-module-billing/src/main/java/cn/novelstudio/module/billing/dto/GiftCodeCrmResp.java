package cn.novelstudio.module.billing.dto;

import java.time.Instant;

public record GiftCodeCrmResp(
    Long id,
    Long campaignId,
    String code,
    String status,
    String userId,
    Instant redeemedAt,
    Instant createdAt
) {
}
