package cn.novelstudio.module.billing.dto;

public record PayOrderStatusResp(
    Long localOrderId,
    String orderId,
    String planCode,
    String status,
    boolean paid,
    String payUrl
) {
}
