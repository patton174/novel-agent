package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.entity.ProductPlanEntity;
import cn.novelstudio.module.billing.repository.UsagePeriodSummaryRepository;
import cn.novelstudio.module.billing.support.BillingPeriodSupport;
import cn.novelstudio.module.billing.support.BillingRedisKeys;
import cn.novelstudio.module.billing.support.BillingRpmChecker;
import cn.novelstudio.module.billing.support.EffectiveQuotaSupport;
import cn.novelstudio.kernel.exception.BizException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuotaBizTest {

    @Mock
    private SubscriptionBiz subscriptionBiz;
    @Mock
    private UsagePeriodSummaryRepository usagePeriodSummaryRepository;
    @Mock
    private UsageReportBiz usageReportBiz;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOps;
    @Mock
    private EffectiveQuotaSupport effectiveQuotaSupport;
    @Mock
    private BillingRpmChecker rpmChecker;

    private QuotaBiz quotaBiz;

    @BeforeEach
    void setUp() {
        quotaBiz = new QuotaBiz(
            subscriptionBiz,
            usagePeriodSummaryRepository,
            usageReportBiz,
            redisTemplate,
            effectiveQuotaSupport,
            rpmChecker
        );
    }

    @Test
    void overagePolicy_allowsTokenOverage_butBlocksRunOverage() {
        ProductPlanEntity overagePlan = planWithPolicy("overage", 100L, 10);
        when(subscriptionBiz.resolvePlanForUser(1L)).thenReturn(overagePlan);
        doNothing().when(rpmChecker).check(eq(1L), anyInt(), any(Duration.class));
        when(effectiveQuotaSupport.resolve(1L, overagePlan))
            .thenReturn(new EffectiveQuotaSupport.EffectiveQuota(100L, 10));
        mockRedisUsage("100", "0");

        assertThatCode(() -> quotaBiz.checkAndReserveRun(1L)).doesNotThrowAnyException();
        verify(usageReportBiz).recordRunStart(1L);

        when(effectiveQuotaSupport.resolve(2L, overagePlan))
            .thenReturn(new EffectiveQuotaSupport.EffectiveQuota(50L, 10));
        when(subscriptionBiz.resolvePlanForUser(2L)).thenReturn(overagePlan);
        mockRedisUsageForUser(2L, "50", "10");

        assertThatThrownBy(() -> quotaBiz.checkAndReserveRun(2L)).isInstanceOf(BizException.class);
        verify(usageReportBiz, never()).recordRunStart(2L);

        ProductPlanEntity blockPlan = planWithPolicy("block", 100L, 10);
        when(subscriptionBiz.resolvePlanForUser(3L)).thenReturn(blockPlan);
        when(effectiveQuotaSupport.resolve(3L, blockPlan))
            .thenReturn(new EffectiveQuotaSupport.EffectiveQuota(100L, 10));
        mockRedisUsageForUser(3L, "100", "0");

        assertThatThrownBy(() -> quotaBiz.checkAndReserveRun(3L)).isInstanceOf(BizException.class);
    }

    @Test
    void checkAndReserveRun_invokesRpmChecker() {
        ProductPlanEntity plan = planWithPolicy("block", 10_000L, 50);
        plan.setRateLimitRpm(30);
        when(subscriptionBiz.resolvePlanForUser(5L)).thenReturn(plan);
        when(effectiveQuotaSupport.resolve(5L, plan))
            .thenReturn(new EffectiveQuotaSupport.EffectiveQuota(10_000L, 50));
        mockRedisUsageForUser(5L, null, null);

        quotaBiz.checkAndReserveRun(5L);

        verify(rpmChecker).check(5L, 30, Duration.ofSeconds(60));
    }

    private ProductPlanEntity planWithPolicy(String policy, long tokenQuota, int runQuota) {
        ProductPlanEntity plan = new ProductPlanEntity();
        plan.setCode("pro");
        plan.setMonthlyTokenQuota(tokenQuota);
        plan.setMonthlyRunQuota(runQuota);
        plan.setOveragePolicy(policy);
        plan.setRateLimitRpm(60);
        return plan;
    }

    private void mockRedisUsage(String tokens, String runs) {
        mockRedisUsageForUser(1L, tokens, runs);
    }

    private void mockRedisUsageForUser(long userId, String tokens, String runs) {
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        String period = BillingPeriodSupport.currentPeriodYyyyMm();
        when(valueOps.get(BillingRedisKeys.usageTokensKey(userId, period))).thenReturn(tokens);
        when(valueOps.get(BillingRedisKeys.usageRunsKey(userId, period))).thenReturn(runs);
    }
}
