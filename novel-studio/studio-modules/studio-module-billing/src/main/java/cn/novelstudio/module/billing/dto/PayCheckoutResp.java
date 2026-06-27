package cn.novelstudio.module.billing.dto;

import java.time.Instant;
import java.util.List;

public record PayCheckoutResp(
    Long localOrderId,
    String orderId,
    Long planId,
    String planCode,
    String planName,
    String status,
    Integer amountCents,
    String currency,
    List<PayMethodOption> payments,
    String alipayHint,
    Instant expiresAt,
    boolean resumed
) {
    public record PayMethodOption(
        String method,
        String name,
        String desc,
        boolean platform
    ) {
    }
}
