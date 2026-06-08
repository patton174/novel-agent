package com.novel.agent.billing.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record QuotaOverrideReq(
    @NotNull @Min(0) Long tokenBonus,
    @NotNull @Min(0) Integer runBonus,
    Instant expiresAt,
    String reason
) {
}
