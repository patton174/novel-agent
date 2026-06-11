package cn.novelstudio.module.auth.client;

import cn.novelstudio.module.auth.config.AuthIntegrationProperties;
import cn.novelstudio.module.billing.service.biz.SubscriptionBiz;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BillingSubscriptionClient {

    private final SubscriptionBiz subscriptionBiz;
    private final AuthIntegrationProperties integrationProperties;

    public void createDefaultSubscription(long userId) {
        if (!integrationProperties.getBilling().isEnabled()) {
            return;
        }
        try {
            subscriptionBiz.ensureDefaultSubscription(userId);
        } catch (Exception ex) {
            log.warn("billing default subscription failed for user {}: {}", userId, ex.getMessage());
        }
    }
}
