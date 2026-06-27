package cn.novelstudio.module.billing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.Map;

public record GiftCampaignCreateReq(
    @NotBlank(message = "{validation.required}") @Size(max = 128) String name,
    @NotBlank(message = "{validation.required}") String giftType,
    Instant expiresAt,
    Map<String, Object> config
) {
}
