package cn.novelstudio.module.billing.support;

import cn.novelstudio.module.billing.entity.ProductPlanEntity;
import cn.novelstudio.module.billing.entity.UserQuotaOverrideEntity;
import cn.novelstudio.module.billing.repository.UserQuotaOverrideRepository;
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

    /**
     * 私人书库上传限额 = plan_feature.limit_value + Σ override.library_upload_bonus；
     * planFeatureLimit 为 null 表示该套餐不限量，直接返回 null。
     */
    public Integer resolveLibraryUploadLimit(long userId, Integer planFeatureLimit) {
        if (planFeatureLimit == null) {
            return null;
        }
        List<UserQuotaOverrideEntity> overrides = userQuotaOverrideRepository.findActiveByUserId(userId, Instant.now());
        int bonus = 0;
        for (UserQuotaOverrideEntity override : overrides) {
            bonus += override.getLibraryUploadBonus() == null ? 0 : override.getLibraryUploadBonus();
        }
        return planFeatureLimit + bonus;
    }
}
