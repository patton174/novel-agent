package cn.novelstudio.module.billing.dto;

import jakarta.validation.constraints.NotBlank;

public record InternalAuditLogReq(
    long actorId,
    @NotBlank(message = "{validation.billing.audit_action_required}") String action,
    String targetType,
    String targetId,
    Object before,
    Object after
) {
}
