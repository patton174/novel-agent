package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.repository.PlanFeatureRepository;
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
}
