package cn.novelstudio.module.auth.client;

import cn.novelstudio.module.auth.config.AuthIntegrationProperties;
import cn.novelstudio.module.billing.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class BillingAuditClient {

    private final AuditLogService auditLogService;
    private final AuthIntegrationProperties integrationProperties;

    public void logRoleChange(long actorId, long targetUserId, String beforeRole, String afterRole) {
        if (!integrationProperties.getBilling().isEnabled()) {
            return;
        }
        try {
            auditLogService.log(
                actorId,
                "user.role.change",
                "user",
                String.valueOf(targetUserId),
                Map.of("role", beforeRole),
                Map.of("role", afterRole)
            );
        } catch (Exception ex) {
            log.warn("billing audit log failed: {}", ex.getMessage());
        }
    }
}
