package com.novel.agent.auth.client;

import com.fasterxml.jackson.core.type.TypeReference;
import com.novel.agent.auth.config.AuthIntegrationProperties;
import com.novel.agent.common.core.base.Result;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
@RequiredArgsConstructor
public class BillingSettingsClient {

    private static final String INTERNAL_KEY_HEADER = "X-Internal-Service-Key";

    private final RestClient billingRestClient;
    private final AuthIntegrationProperties integrationProperties;

    public boolean isRegistrationEnabled() {
        if (!integrationProperties.getBilling().isEnabled()) {
            return true;
        }
        try {
            Result<PublicSettingsWire> result = billingRestClient.get()
                .uri("/internal/billing/settings/public")
                .header(INTERNAL_KEY_HEADER, integrationProperties.getInternal().getServiceKey())
                .retrieve()
                .body(new TypeReference<Result<PublicSettingsWire>>() {});
            if (result == null || result.data() == null) {
                return true;
            }
            return result.data().registrationEnabled();
        } catch (Exception ex) {
            log.warn("billing settings fetch failed, allow registration: {}", ex.getMessage());
            return true;
        }
    }

    private record PublicSettingsWire(boolean registrationEnabled, boolean registrationRequireEmailVerify) {
    }
}
