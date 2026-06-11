package cn.novelstudio.module.billing.dto;

import jakarta.validation.constraints.NotBlank;

public record UserSubscriptionUpdateReq(
    @NotBlank String planCode,
    String reason
) {
}
