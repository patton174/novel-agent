package cn.novelstudio.module.billing.dto;

public record PayPendingResp(
    String orderId,
    String planCode,
    String planName,
    String status,
    Integer amountCents,
    String currency
) {}
