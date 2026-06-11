package cn.novelstudio.module.content.client;

import cn.novelstudio.module.billing.service.biz.FeatureGateBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BillingFeatureClient {

    private final FeatureGateBiz featureGateBiz;

    @Value("${agent.billing.enabled:true}")
    private boolean billingEnabled;

    public void assertFeature(long userId, String featureKey) {
        if (!billingEnabled) {
            return;
        }
        featureGateBiz.assertFeature(userId, featureKey);
    }
}
