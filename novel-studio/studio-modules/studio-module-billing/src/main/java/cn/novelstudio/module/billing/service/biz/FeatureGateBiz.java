package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.repository.PlanFeatureRepository;
import cn.novelstudio.module.billing.support.EffectiveQuotaSupport;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class FeatureGateBiz extends BaseBiz {

    private final SubscriptionBiz subscriptionBiz;
    private final PlanFeatureRepository planFeatureRepository;
    private final EffectiveQuotaSupport effectiveQuotaSupport;

    public boolean hasFeature(long userId, String featureKey) {
        var plan = subscriptionBiz.resolvePlanForUser(userId);
        return planFeatureRepository.existsByPlanIdAndFeatureKeyAndEnabledTrue(plan.getId(), featureKey);
    }

    public void assertFeature(long userId, String featureKey) {
        if (!hasFeature(userId, featureKey)) {
            throw BizException.of(ResultCode.BILLING_FEATURE_NOT_AVAILABLE);
        }
    }

    public Result<List<String>> listEnabledFeatures(long userId) {
        var plan = subscriptionBiz.resolvePlanForUser(userId);
        List<String> keys = planFeatureRepository.findByPlanIdAndEnabledTrue(plan.getId()).stream()
            .map(f -> f.getFeatureKey())
            .toList();
        return ok(keys);
    }

    /**
     * 取某用户某 feature 的有效限额值：plan_feature.limit_value（null=无限/不适用）
     * 叠加 user_quota_override 加成（如 library_upload_bonus）。null 表示不限量。
     */
    public Integer getFeatureLimit(long userId, String featureKey) {
        var plan = subscriptionBiz.resolvePlanForUser(userId);
        Integer planLimit = planFeatureRepository.findLimitValueByPlanAndKey(plan.getId(), featureKey).orElse(null);
        return effectiveQuotaSupport.resolveLibraryUploadLimit(userId, planLimit);
    }

    public String resolvePlanCode(long userId) {
        return subscriptionBiz.resolvePlanForUser(userId).getCode();
    }
}
