package com.novel.agent.content.client;

import com.fasterxml.jackson.core.type.TypeReference;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.common.core.exception.BizException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
@RequiredArgsConstructor
public class BillingFeatureClient {

    private static final String INTERNAL_KEY_HEADER = "X-Internal-Service-Key";

    private final RestClient billingRestClient;

    @Value("${agent.billing.enabled:true}")
    private boolean billingEnabled;

    @Value("${agent.internal.service-key:dev-internal-key-change-me}")
    private String internalServiceKey;

    public void assertFeature(long userId, String featureKey) {
        if (!billingEnabled) {
            return;
        }
        try {
            billingRestClient.post()
                .uri("/internal/billing/features/assert?userId={userId}&featureKey={featureKey}", userId, featureKey)
                .header(INTERNAL_KEY_HEADER, internalServiceKey)
                .retrieve()
                .body(new TypeReference<Result<Void>>() {});
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 403) {
                throw BizException.of(ResultCode.BILLING_FEATURE_NOT_AVAILABLE);
            }
            throw ex;
        }
    }
}
