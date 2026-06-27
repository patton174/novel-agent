package cn.novelstudio.module.billing.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record GiftCodeGenerateReq(
    @NotNull @Min(1) @Max(500) Integer quantity
) {
}
