package cn.novelstudio.module.billing.dto;

import java.util.List;

public record UserReferralConversionsResp(
    List<UserReferralConversionItem> items
) {
}
