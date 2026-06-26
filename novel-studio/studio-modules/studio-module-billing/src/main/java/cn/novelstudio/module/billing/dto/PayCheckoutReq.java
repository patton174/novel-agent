package cn.novelstudio.module.billing.dto;

public record PayCheckoutReq(
    String planCode,
    String orderId
) {}
