package cn.novelstudio.module.billing.dto;

import jakarta.validation.constraints.NotBlank;

public record PayStartReq(
    @NotBlank(message = "{validation.billing.order_id_required}") String orderId,
    String method
) {
}
