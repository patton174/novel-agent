package cn.novelstudio.module.billing.dto;

import jakarta.validation.constraints.NotBlank;

public record InternalAuditLogReq(
    long actorId,
    @NotBlank String action,
    String targetType,
    String targetId,
    Object before,
    Object after
) {
}
