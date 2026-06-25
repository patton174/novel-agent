package cn.novelstudio.module.billing.dto;

import java.time.Instant;
import java.util.Map;

public record PaymentOrderCrmDetailResp(
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
    String contactInfo,
    Integer amountCents,
    String currency,
    String payUrl,
    Instant paidAt,
    Instant createdAt,
    Instant updatedAt,
    Map<String, Object> callbackJson,
    String remoteStatus,
    Map<String, Object> remoteSnapshot
) {
}
