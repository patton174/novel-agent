package com.novel.agent.billing.service.biz;

import com.novel.agent.billing.entity.ProductPlanEntity;
import com.novel.agent.billing.entity.UsagePeriodSummaryEntity;
import com.novel.agent.billing.entity.UsagePeriodSummaryId;
import com.novel.agent.billing.repository.UsagePeriodSummaryRepository;
import com.novel.agent.billing.support.BillingPeriodSupport;
import com.novel.agent.billing.support.BillingRedisKeys;
import com.novel.agent.billing.support.EffectiveQuotaSupport;
import com.novel.agent.common.core.exception.BizException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

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

    private QuotaBiz quotaBiz;

    @BeforeEach
    void setUp() {
        quotaBiz = new QuotaBiz(
            subscriptionBiz,
            usagePeriodSummaryRepository,
            usageReportBiz,
            redisTemplate,
            effectiveQuotaSupport
        );
    }

    @Test
    void checkAndReserveRun_throwsWhenOverTokenQuota() {
        ProductPlanEntity plan = new ProductPlanEntity();
        plan.setCode("hobby");
        plan.setMonthlyTokenQuota(100L);
        plan.setMonthlyRunQuota(10);

        when(subscriptionBiz.resolvePlanForUser(1L)).thenReturn(plan);
        when(effectiveQuotaSupport.resolve(1L, plan))
            .thenReturn(new EffectiveQuotaSupport.EffectiveQuota(100L, 10));
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(anyString())).thenReturn("100");

        assertThrows(BizException.class, () -> quotaBiz.checkAndReserveRun(1L));
        verify(usageReportBiz, never()).recordRunStart(anyLong());
    }

    @Test
    void peek_allowsWhenUnderQuota() {
        ProductPlanEntity plan = new ProductPlanEntity();
        plan.setCode("hobby");
        plan.setMonthlyTokenQuota(10_000L);
        plan.setMonthlyRunQuota(50);

        when(subscriptionBiz.resolvePlanForUser(2L)).thenReturn(plan);
        when(effectiveQuotaSupport.resolve(2L, plan))
            .thenReturn(new EffectiveQuotaSupport.EffectiveQuota(10_000L, 50));
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(BillingRedisKeys.usageTokensKey(2L, BillingPeriodSupport.currentPeriodYyyyMm())))
            .thenReturn(null);
        when(valueOps.get(BillingRedisKeys.usageRunsKey(2L, BillingPeriodSupport.currentPeriodYyyyMm())))
            .thenReturn(null);

        UsagePeriodSummaryId id = new UsagePeriodSummaryId();
        id.setUserId(2L);
        id.setPeriodYyyyMm(BillingPeriodSupport.currentPeriodYyyyMm());
        when(usagePeriodSummaryRepository.findById(id)).thenReturn(Optional.empty());

        var resp = quotaBiz.peek(2L);
        assertTrue(resp.allowed());
    }
}
