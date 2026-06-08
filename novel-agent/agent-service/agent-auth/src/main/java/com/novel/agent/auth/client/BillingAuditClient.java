package com.novel.agent.auth.client;

import com.novel.agent.auth.config.AuthIntegrationProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class BillingAuditClient {

    private static final String INTERNAL_KEY_HEADER = "X-Internal-Service-Key";

    private final RestClient billingRestClient;
    private final AuthIntegrationProperties integrationProperties;

    public void logRoleChange(long actorId, long targetUserId, String beforeRole, String afterRole) {
        if (!integrationProperties.getBilling().isEnabled()) {
            return;
        }
        try {
            billingRestClient.post()
                .uri("/internal/billing/audit/log")
                .contentType(MediaType.APPLICATION_JSON)
                .header(INTERNAL_KEY_HEADER, integrationProperties.getInternal().getServiceKey())
                .body(Map.of(
                    "actorId", actorId,
                    "action", "user.role.change",
                    "targetType", "user",
                    "targetId", String.valueOf(targetUserId),
                    "before", Map.of("role", beforeRole),
                    "after", Map.of("role", afterRole)
                ))
                .retrieve()
                .toBodilessEntity();
        } catch (Exception ex) {
            log.warn("billing audit log failed: {}", ex.getMessage());
        }
    }
}
