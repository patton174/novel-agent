package com.novel.agent.billing.dto;

import jakarta.validation.constraints.NotBlank;

public record UserSubscriptionUpdateReq(
    @NotBlank String planCode,
    String reason
) {
}
