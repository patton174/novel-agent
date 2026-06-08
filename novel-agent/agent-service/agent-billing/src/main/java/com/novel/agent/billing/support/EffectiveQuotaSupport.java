package com.novel.agent.billing.support;

import com.novel.agent.billing.entity.ProductPlanEntity;
import com.novel.agent.billing.entity.UserQuotaOverrideEntity;
import com.novel.agent.billing.repository.UserQuotaOverrideRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
public class EffectiveQuotaSupport {

    public record EffectiveQuota(Long tokenQuota, Integer runQuota) {}

    private final UserQuotaOverrideRepository userQuotaOverrideRepository;

    public EffectiveQuota resolve(long userId, ProductPlanEntity plan) {
        List<UserQuotaOverrideEntity> overrides = userQuotaOverrideRepository.findActiveByUserId(userId, Instant.now());
        long tokenBonus = 0L;
        int runBonus = 0;
        for (UserQuotaOverrideEntity override : overrides) {
            tokenBonus += override.getTokenBonus() == null ? 0L : override.getTokenBonus();
            runBonus += override.getRunBonus() == null ? 0 : override.getRunBonus();
        }
        Long tokenQuota = plan.getMonthlyTokenQuota() == null
            ? null
            : plan.getMonthlyTokenQuota() + tokenBonus;
        Integer runQuota = plan.getMonthlyRunQuota() == null
            ? null
            : plan.getMonthlyRunQuota() + runBonus;
        return new EffectiveQuota(tokenQuota, runQuota);
    }
}
