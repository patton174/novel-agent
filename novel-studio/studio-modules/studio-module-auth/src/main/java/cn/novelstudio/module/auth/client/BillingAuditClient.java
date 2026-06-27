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

    public void logInviteCreate(long actorId, long inviteCodeId, String code, Map<String, Object> after) {
        if (!integrationProperties.getBilling().isEnabled()) {
            return;
        }
        try {
            auditLogService.log(
                actorId,
                "invite.create",
                "invite_code",
                String.valueOf(inviteCodeId),
                null,
                after
            );
        } catch (Exception ex) {
            log.warn("billing audit log failed: {}", ex.getMessage());
        }
    }

    public void logInviteDisable(long actorId, long inviteCodeId, Map<String, Object> before, Map<String, Object> after) {
        if (!integrationProperties.getBilling().isEnabled()) {
            return;
        }
        try {
            auditLogService.log(
                actorId,
                "invite.disable",
                "invite_code",
                String.valueOf(inviteCodeId),
                before,
                after
            );
        } catch (Exception ex) {
            log.warn("billing audit log failed: {}", ex.getMessage());
        }
    }

    public void logInviteUpdate(long actorId, long inviteCodeId, Map<String, Object> before, Map<String, Object> after) {
        if (!integrationProperties.getBilling().isEnabled()) {
            return;
        }
        try {
            auditLogService.log(
                actorId,
                "invite.update",
                "invite_code",
                String.valueOf(inviteCodeId),
                before,
                after
            );
        } catch (Exception ex) {
            log.warn("billing audit log failed: {}", ex.getMessage());
        }
    }

    public void logInviteRedeem(long userId, long inviteCodeId, String code) {
        if (!integrationProperties.getBilling().isEnabled()) {
            return;
        }
        try {
            auditLogService.log(
                userId,
                "invite.redeem",
                "invite_code",
                String.valueOf(inviteCodeId),
                null,
                Map.of("code", code, "userId", userId)
            );
        } catch (Exception ex) {
            log.warn("billing audit log failed: {}", ex.getMessage());
        }
    }
}
