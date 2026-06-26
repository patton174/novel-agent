package cn.novelstudio.module.billing.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record QuotaOverrideReq(
    @NotNull(message = "{validation.billing.quota_bonus_required}") @Min(value = 0, message = "{validation.number.min_zero}") Long tokenBonus,
    @NotNull(message = "{validation.billing.quota_bonus_required}") @Min(value = 0, message = "{validation.number.min_zero}") Integer runBonus,
    Instant expiresAt,
    String reason
) {
}
