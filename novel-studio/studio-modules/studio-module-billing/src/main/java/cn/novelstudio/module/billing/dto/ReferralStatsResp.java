package cn.novelstudio.module.billing.dto;

import java.util.List;

public record ReferralStatsResp(
    long totalSignups,
    long totalPaid,
    double overallConversionRate,
    List<ReferrerRow> topReferrers
) {

    public record ReferrerRow(
        long referrerUserId,
        String referralCode,
        long signupCount,
        long paidCount,
        double conversionRate
    ) {
    }
}
