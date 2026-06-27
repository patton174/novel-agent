package cn.novelstudio.module.auth.service.crm.req;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

public record InviteCrmCreateReq(
    @Min(0) int maxUses,
    Instant expiresAt,
    @NotBlank String rewardType,
    String rewardPayload
) {}
