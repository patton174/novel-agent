package cn.novelstudio.module.billing.dto;

import jakarta.validation.constraints.NotBlank;

public record PayCheckoutReq(
    @NotBlank String planCode
) {
}
