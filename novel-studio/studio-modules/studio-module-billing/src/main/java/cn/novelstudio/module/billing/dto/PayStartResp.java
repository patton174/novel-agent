package cn.novelstudio.module.billing.dto;

public record PayStartResp(
    String payUrl,
    String payCurrency,
    Double amount,
    String alipayHint
) {
}
