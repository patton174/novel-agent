package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.dto.UsageReportRequest;
import cn.novelstudio.module.billing.entity.ProductPlanEntity;
import cn.novelstudio.module.billing.entity.UsagePeriodSummaryEntity;
import cn.novelstudio.module.billing.repository.UsageEventRepository;
import cn.novelstudio.module.billing.repository.UsagePeriodSummaryRepository;
import cn.novelstudio.module.billing.repository.UserBalanceRepository;
import cn.novelstudio.module.billing.support.BillingPeriodSupport;
import cn.novelstudio.module.billing.support.BillingRedisKeys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UsageReportBizTest {

    @Mock
    private UsageEventRepository usageEventRepository;
    @Mock
    private UsagePeriodSummaryRepository usagePeriodSummaryRepository;
    @Mock
    private SubscriptionBiz subscriptionBiz;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOps;
    @Mock
    private UserBalanceRepository userBalanceRepo;

    private UsageReportBiz usageReportBiz;

    @BeforeEach
    void setUp() {
        usageReportBiz = new UsageReportBiz(
            usageEventRepository,
            usagePeriodSummaryRepository,
            subscriptionBiz,
            redisTemplate,
            userBalanceRepo
        );
    }

    @Test
    void persistReport_overage_deductsBalance_andAccumulatesOverage() {
        long userId = 42L;
        String period = BillingPeriodSupport.currentPeriodYyyyMm();
        ProductPlanEntity plan = overagePlan(1000L);
        when(subscriptionBiz.resolvePlanForUser(userId)).thenReturn(plan);
        when(usageEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(BillingRedisKeys.usageTokensKey(userId, period))).thenReturn("1000");
        when(valueOps.increment(anyString(), anyLong())).thenReturn(1150L);
        when(userBalanceRepo.deduct(userId, 500L)).thenReturn(1);
        when(usagePeriodSummaryRepository.findById(any())).thenReturn(Optional.empty());

        usageReportBiz.persistReport(overageRequest(userId, 500L, false));

        verify(userBalanceRepo).deduct(userId, 500L);
        ArgumentCaptor<UsagePeriodSummaryEntity> summaryCaptor =
            ArgumentCaptor.forClass(UsagePeriodSummaryEntity.class);
        verify(usagePeriodSummaryRepository).save(summaryCaptor.capture());
        assertThat(summaryCaptor.getValue().getOverageMicros()).isEqualTo(500L);
    }

    @Test
    void persistReport_blockPolicy_doesNotDeductBalance() {
        long userId = 43L;
        ProductPlanEntity plan = blockPlan(1000L);
        when(subscriptionBiz.resolvePlanForUser(userId)).thenReturn(plan);
        when(usageEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.increment(anyString(), anyLong())).thenReturn(1150L);
        when(usagePeriodSummaryRepository.findById(any())).thenReturn(Optional.empty());

        usageReportBiz.persistReport(overageRequest(userId, 500L, false));

        verify(userBalanceRepo, never()).deduct(anyLong(), anyLong());
        ArgumentCaptor<UsagePeriodSummaryEntity> summaryCaptor =
            ArgumentCaptor.forClass(UsagePeriodSummaryEntity.class);
        verify(usagePeriodSummaryRepository).save(summaryCaptor.capture());
        assertThat(summaryCaptor.getValue().getOverageMicros()).isEqualTo(0L);
    }

    @Test
    void persistReport_byok_doesNotDeductBalance() {
        long userId = 44L;
        ProductPlanEntity plan = overagePlan(1000L);
        when(subscriptionBiz.resolvePlanForUser(userId)).thenReturn(plan);
        when(usageEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.increment(anyString(), anyLong())).thenReturn(1150L);
        when(usagePeriodSummaryRepository.findById(any())).thenReturn(Optional.empty());

        usageReportBiz.persistReport(overageRequest(userId, 500L, true));

        verify(userBalanceRepo, never()).deduct(anyLong(), anyLong());
        verify(valueOps, never()).get(anyString());
    }

    private static UsageReportRequest overageRequest(long userId, long cost, boolean byok) {
        return new UsageReportRequest(
            userId,
            null,
            null,
            null,
            "llm_call",
            byok ? "byok:1" : "gpt-4",
            100,
            50,
            0,
            0,
            cost,
            null,
            null,
            byok
        );
    }

    private static ProductPlanEntity overagePlan(long tokenQuota) {
        ProductPlanEntity plan = new ProductPlanEntity();
        plan.setCode("pro");
        plan.setOveragePolicy("overage");
        plan.setMonthlyTokenQuota(tokenQuota);
        return plan;
    }

    private static ProductPlanEntity blockPlan(long tokenQuota) {
        ProductPlanEntity plan = new ProductPlanEntity();
        plan.setCode("hobby");
        plan.setOveragePolicy("block");
        plan.setMonthlyTokenQuota(tokenQuota);
        return plan;
    }
}
