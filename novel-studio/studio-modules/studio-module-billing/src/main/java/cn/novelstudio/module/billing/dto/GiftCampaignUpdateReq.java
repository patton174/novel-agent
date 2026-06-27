package cn.novelstudio.module.billing.dto;

import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.Map;

public record GiftCampaignUpdateReq(
    @Size(max = 128) String name,
    Instant expiresAt,
    Map<String, Object> config,
    String status
) {
}
