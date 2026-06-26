package cn.novelstudio.module.billing.dto;

import jakarta.validation.constraints.NotBlank;

public record UserSubscriptionUpdateReq(
    @NotBlank(message = "{validation.billing.plan_code_required}") String planCode,
    String reason
) {
}
