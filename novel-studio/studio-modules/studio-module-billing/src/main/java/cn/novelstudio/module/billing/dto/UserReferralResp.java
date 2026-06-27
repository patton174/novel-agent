package cn.novelstudio.module.billing.dto;

public record UserReferralResp(
    String code,
    String referralLink,
    long referralCount,
    long paidCount
) {
}
