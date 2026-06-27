package cn.novelstudio.module.auth.service.crm.req;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.Map;

public record InviteCrmUpdateReq(
    String code,
    @Min(0) int maxUses,
    Instant expiresAt,
    @NotBlank String rewardType,
    Map<String, Object> rewardPayload
) {}
