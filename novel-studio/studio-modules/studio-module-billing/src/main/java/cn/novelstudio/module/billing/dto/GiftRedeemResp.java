package cn.novelstudio.module.billing.dto;

public record GiftRedeemResp(
    String giftType,
    String campaignName,
    Long tokenBonus,
    Integer runBonus,
    String planCode,
    String licenseKey
) {
}
