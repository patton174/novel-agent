package cn.novelstudio.module.billing.dto;

import java.time.Instant;

public record PaymentOrderCrmResp(
    long id,
    long userId,
    Long planId,
    String planCode,
    String planName,
    String idrSkuId,
    String idrProjectId,
    String idrOrderId,
    String status,
    String payMethod,
    Integer amountCents,
    String currency,
    String payUrl,
    Instant paidAt,
    Instant createdAt,
    Instant updatedAt
) {
}
