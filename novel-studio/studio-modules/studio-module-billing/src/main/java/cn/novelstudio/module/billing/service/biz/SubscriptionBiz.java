package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.dto.SubscriptionResp;
import cn.novelstudio.module.billing.entity.ProductPlanEntity;
import cn.novelstudio.module.billing.entity.UserSubscriptionEntity;
import cn.novelstudio.module.billing.repository.UserSubscriptionRepository;
import cn.novelstudio.module.billing.service.AuditLogService;
import cn.novelstudio.module.billing.support.BillingPeriodSupport;
import cn.novelstudio.module.billing.support.BillingRedisKeys;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class SubscriptionBiz extends BaseBiz {

    private final UserSubscriptionRepository userSubscriptionRepository;
    private final PlanBiz planBiz;
    private final StringRedisTemplate redisTemplate;
    private final AuditLogService auditLogService;

    @Transactional
    public UserSubscriptionEntity ensureDefaultSubscription(long userId) {
        return userSubscriptionRepository.findByUserId(userId)
            .orElseGet(() -> createSubscription(userId, "hobby"));
    }

    @Transactional
    public UserSubscriptionEntity createSubscription(long userId, String planCode) {
        ProductPlanEntity plan = planBiz.requireActivePlanByCode(planCode);
        String period = BillingPeriodSupport.currentPeriodYyyyMm();
        Instant start = BillingPeriodSupport.monthStartUtc(period);
        Instant end = YearMonth.parse(period).plusMonths(1).atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        UserSubscriptionEntity sub = new UserSubscriptionEntity();
        sub.setUserId(userId);
        sub.setPlanId(plan.getId());
        sub.setStatus("active");
        sub.setCurrentPeriodStart(start);
        sub.setCurrentPeriodEnd(end);
        return userSubscriptionRepository.save(sub);
    }

    public Result<SubscriptionResp> getSubscription(long userId) {
        UserSubscriptionEntity sub = ensureDefaultSubscription(userId);
        ProductPlanEntity plan = planBiz.requirePlanById(sub.getPlanId());
        return ok(new SubscriptionResp(
            plan.getCode(),
            plan.getName(),
            sub.getStatus(),
            sub.getCurrentPeriodStart(),
            sub.getCurrentPeriodEnd()
        ));
    }

    public ProductPlanEntity resolvePlanForUser(long userId) {
        UserSubscriptionEntity sub = ensureDefaultSubscription(userId);
        return planBiz.requirePlanById(sub.getPlanId());
    }

    @Transactional
    public void changeUserPlan(long userId, String planCode, Long actorId, String reason) {
        ProductPlanEntity plan = planBiz.requireActivePlanByCode(planCode);
        var existing = userSubscriptionRepository.findByUserId(userId);
        String beforePlan = existing
            .map(s -> planBiz.requirePlanById(s.getPlanId()).getCode())
            .orElse("none");
        UserSubscriptionEntity sub = existing.orElseGet(() -> createSubscription(userId, planCode));
        sub.setPlanId(plan.getId());
        sub.setStatus("active");
        userSubscriptionRepository.save(sub);
        invalidatePlanCache(userId);
        auditLogService.log(
            actorId,
            "user.subscription.change",
            "user",
            String.valueOf(userId),
            Map.of("planCode", beforePlan),
            Map.of("planCode", planCode, "reason", reason == null ? "" : reason)
        );
    }

    private void invalidatePlanCache(long userId) {
        String period = BillingPeriodSupport.currentPeriodYyyyMm();
        redisTemplate.delete(BillingRedisKeys.usageTokensKey(userId, period));
        redisTemplate.delete(BillingRedisKeys.usageRunsKey(userId, period));
    }
}
