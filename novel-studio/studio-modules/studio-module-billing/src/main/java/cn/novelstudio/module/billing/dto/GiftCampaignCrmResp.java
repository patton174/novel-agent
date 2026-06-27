package cn.novelstudio.module.billing.dto;

import java.time.Instant;
import java.util.Map;

public record GiftCampaignCrmResp(
    Long id,
    String name,
    String giftType,
    String status,
    Instant expiresAt,
    Map<String, Object> config,
    int codeCount,
    int redeemedCount,
    Long createdBy,
    Instant createdAt,
    Instant updatedAt
) {
}
