package com.novel.agent.auth.client;

import com.novel.agent.auth.config.AuthIntegrationProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
@RequiredArgsConstructor
public class BillingSubscriptionClient {

    private static final String INTERNAL_KEY_HEADER = "X-Internal-Service-Key";

    private final RestClient billingRestClient;
    private final AuthIntegrationProperties integrationProperties;

    public void createDefaultSubscription(long userId) {
        if (!integrationProperties.getBilling().isEnabled()) {
            return;
        }
        try {
            billingRestClient.post()
                .uri("/internal/billing/subscription/default?userId={userId}", userId)
                .header(INTERNAL_KEY_HEADER, integrationProperties.getInternal().getServiceKey())
                .retrieve()
                .toBodilessEntity();
        } catch (Exception ex) {
            log.warn("billing default subscription failed for user {}: {}", userId, ex.getMessage());
        }
    }
}
