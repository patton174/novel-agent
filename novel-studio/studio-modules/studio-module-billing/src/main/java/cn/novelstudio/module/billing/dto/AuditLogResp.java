package cn.novelstudio.module.billing.dto;

import java.time.Instant;

public record AuditLogResp(
    long id,
    long actorId,
    String action,
    String targetType,
    String targetId,
    String beforeJson,
    String afterJson,
    Instant createdAt
) {
}
