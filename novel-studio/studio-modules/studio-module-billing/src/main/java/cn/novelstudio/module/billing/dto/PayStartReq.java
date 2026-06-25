package cn.novelstudio.module.billing.dto;

import jakarta.validation.constraints.NotBlank;

public record PayStartReq(
    @NotBlank String orderId,
    String method
) {
}
