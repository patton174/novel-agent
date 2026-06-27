package cn.novelstudio.module.billing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GiftRedeemReq(
    @NotBlank(message = "{validation.required}") @Size(max = 64) String code
) {
}
