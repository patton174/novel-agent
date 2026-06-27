package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.billing.dto.ReferralStatsResp;
import cn.novelstudio.module.billing.entity.ReferralCodeEntity;
import cn.novelstudio.module.billing.repository.ReferralAttributionRepository;
import cn.novelstudio.module.billing.repository.ReferralCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class ReferralCrmBiz extends BaseBiz {

    private final ReferralAttributionRepository referralAttributionRepository;
    private final ReferralCodeRepository referralCodeRepository;

    public Result<ReferralStatsResp> stats(int topLimit) {
        int limit = Math.max(topLimit, 1);
        List<Object[]> rows = referralAttributionRepository.summarizeByReferrer();
        long totalSignups = 0L;
        long totalPaid = 0L;
        for (Object[] row : rows) {
            totalSignups += toLong(row[1]);
            totalPaid += toLong(row[2]);
        }

        List<Object[]> topRows = rows.size() <= limit ? rows : rows.subList(0, limit);
        Map<Long, String> codeByUserId = referralCodeRepository.findAll().stream()
            .collect(Collectors.toMap(ReferralCodeEntity::getUserId, ReferralCodeEntity::getCode, (a, b) -> a));

        List<ReferralStatsResp.ReferrerRow> topReferrers = new ArrayList<>();
        for (Object[] row : topRows) {
            long referrerUserId = toLong(row[0]);
            long signupCount = toLong(row[1]);
            long paidCount = toLong(row[2]);
            double conversionRate = signupCount == 0 ? 0.0 : (double) paidCount / signupCount;
            topReferrers.add(new ReferralStatsResp.ReferrerRow(
                referrerUserId,
                codeByUserId.get(referrerUserId),
                signupCount,
                paidCount,
                conversionRate
            ));
        }

        double overallConversionRate = totalSignups == 0 ? 0.0 : (double) totalPaid / totalSignups;
        return ok(new ReferralStatsResp(totalSignups, totalPaid, overallConversionRate, topReferrers));
    }

    private static long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(String.valueOf(value));
    }
}
