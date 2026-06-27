package cn.novelstudio.module.auth.service.crm.resp;

import java.time.Instant;

public record InviteCrmItemResp(
    Long id,
    String code,
    Long createdBy,
    int maxUses,
    int usedCount,
    Instant expiresAt,
    String rewardType,
    String rewardPayload,
    String status,
    Instant createdAt
) {}
