package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.dto.QuotaCheckResp;
import cn.novelstudio.module.billing.entity.ProductPlanEntity;
import cn.novelstudio.module.billing.entity.UsagePeriodSummaryEntity;
import cn.novelstudio.module.billing.entity.UsagePeriodSummaryId;
import cn.novelstudio.module.billing.repository.UsagePeriodSummaryRepository;
import cn.novelstudio.module.billing.support.BillingPeriodSupport;
import cn.novelstudio.module.billing.support.BillingRedisKeys;
import cn.novelstudio.module.billing.support.BillingRpmChecker;
import cn.novelstudio.module.billing.support.EffectiveQuotaSupport;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class QuotaBiz extends BaseBiz {

    private final SubscriptionBiz subscriptionBiz;
    private final UsagePeriodSummaryRepository usagePeriodSummaryRepository;
    private final UsageReportBiz usageReportBiz;
    private final StringRedisTemplate redisTemplate;
    private final EffectiveQuotaSupport effectiveQuotaSupport;
    private final BillingRpmChecker rpmChecker;

    public QuotaCheckResp checkAndReserveRun(long userId) {
        ProductPlanEntity plan = subscriptionBiz.resolvePlanForUser(userId);
        rpmChecker.check(
            userId,
            plan.getRateLimitRpm() == null ? 60 : plan.getRateLimitRpm(),
            Duration.ofSeconds(60)
        );
        var effective = effectiveQuotaSupport.resolve(userId, plan);
        String period = BillingPeriodSupport.currentPeriodYyyyMm();
        long tokensUsed = readUsageTokens(userId, period);
        int runsUsed = (int) readUsageRuns(userId, period);

        boolean tokenOk = isWithinQuota(tokensUsed, effective.tokenQuota());
        boolean runOk = isWithinRunQuota(runsUsed, effective.runQuota());
        assertCanProceed(plan, tokenOk, runOk);

        boolean allowed = tokenOk && runOk;
        usageReportBiz.recordRunStart(userId);
        return buildResp(allowed, tokensUsed, effective.tokenQuota(), runsUsed + 1,
            effective.runQuota(), plan.getCode());
    }

    public QuotaCheckResp peek(long userId) {
        ProductPlanEntity plan = subscriptionBiz.resolvePlanForUser(userId);
        var effective = effectiveQuotaSupport.resolve(userId, plan);
        String period = BillingPeriodSupport.currentPeriodYyyyMm();
        long tokensUsed = readUsageTokens(userId, period);
        int runsUsed = (int) readUsageRuns(userId, period);
        boolean tokenOk = isWithinQuota(tokensUsed, effective.tokenQuota());
        boolean runOk = isWithinRunQuota(runsUsed, effective.runQuota());
        boolean allowed = tokenOk && runOk;
        if (!allowed && runOk && !tokenOk && "overage".equals(plan.getOveragePolicy())) {
            allowed = true;
        }
        return buildResp(allowed, tokensUsed, effective.tokenQuota(), runsUsed,
            effective.runQuota(), plan.getCode());
    }

    private static void assertCanProceed(ProductPlanEntity plan, boolean tokenOk, boolean runOk) {
        if (!runOk) {
            throw BizException.of(
                ResultCode.BILLING_QUOTA_EXCEEDED,
                "本月运行次数已用尽，请升级套餐或等待下月重置"
            );
        }
        if (!tokenOk && !"overage".equals(plan.getOveragePolicy())) {
            throw BizException.of(
                ResultCode.BILLING_QUOTA_EXCEEDED,
                "本月配额已用尽，请升级套餐或等待下月重置"
            );
        }
    }

    private static QuotaCheckResp buildResp(
        boolean allowed,
        long tokensUsed,
        Long tokenQuota,
        int runsUsed,
        Integer runQuota,
        String planCode
    ) {
        double percent = tokenQuota == null || tokenQuota <= 0
            ? 0.0
            : Math.min(100.0, tokensUsed * 100.0 / tokenQuota);
        boolean warn = percent >= 80.0;
        return new QuotaCheckResp(
            allowed,
            tokensUsed,
            tokenQuota,
            runsUsed,
            runQuota,
            planCode,
            Math.round(percent * 10.0) / 10.0,
            warn
        );
    }

    private long readUsageTokens(long userId, String period) {
        Long redis = readRedisLong(BillingRedisKeys.usageTokensKey(userId, period));
        if (redis > 0) {
            return redis;
        }
        UsagePeriodSummaryId id = new UsagePeriodSummaryId();
        id.setUserId(userId);
        id.setPeriodYyyyMm(period);
        return usagePeriodSummaryRepository.findById(id).map(UsagePeriodSummaryEntity::getTokensUsed).orElse(0L);
    }

    private long readUsageRuns(long userId, String period) {
        Long redis = readRedisLong(BillingRedisKeys.usageRunsKey(userId, period));
        if (redis > 0) {
            return redis;
        }
        UsagePeriodSummaryId id = new UsagePeriodSummaryId();
        id.setUserId(userId);
        id.setPeriodYyyyMm(period);
        return usagePeriodSummaryRepository.findById(id).map(s -> (long) s.getRunsUsed()).orElse(0L);
    }

    private long readRedisLong(String key) {
        String raw = redisTemplate.opsForValue().get(key);
        if (raw == null || raw.isBlank()) {
            return 0L;
        }
        try {
            return Long.parseLong(raw);
        } catch (NumberFormatException ex) {
            return 0L;
        }
    }

    private static boolean isWithinQuota(long used, Long quota) {
        return quota == null || used < quota;
    }

    private static boolean isWithinRunQuota(long used, Integer quota) {
        return quota == null || used < quota;
    }
}
