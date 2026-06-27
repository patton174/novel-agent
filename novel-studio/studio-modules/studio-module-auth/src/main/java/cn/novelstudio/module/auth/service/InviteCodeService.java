package cn.novelstudio.module.auth.service;

import cn.novelstudio.module.auth.client.BillingAuditClient;
import cn.novelstudio.module.auth.entity.InviteCodeEntity;
import cn.novelstudio.module.auth.entity.InviteRedemptionEntity;
import cn.novelstudio.module.auth.repository.InviteCodeRepository;
import cn.novelstudio.module.auth.repository.InviteRedemptionRepository;
import cn.novelstudio.module.auth.service.invite.InviteRewardApplier;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.tools.IdWorker;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class InviteCodeService {

    private static final Set<String> ALLOWED_REWARD_TYPES = Set.of("none", "quota_bonus", "plan_trial");

    private final InviteCodeRepository inviteCodeRepository;
    private final InviteRedemptionRepository inviteRedemptionRepository;
    private final InviteRewardApplier inviteRewardApplier;
    private final BillingAuditClient billingAuditClient;

    public InviteCodeEntity requireValidForRegistration(String rawCode) {
        String normalized = normalizeCode(rawCode);
        if (normalized == null) {
            throw BizException.keyed(ResultCode.AUTH_INVITE_INVALID, "auth.invite.required");
        }
        InviteCodeEntity entity = inviteCodeRepository.findByCodeIgnoreCase(normalized)
            .orElseThrow(() -> BizException.keyed(ResultCode.AUTH_INVITE_INVALID, "auth.invite.not_found"));
        assertRedeemable(entity);
        return entity;
    }

    public void assertRedeemable(InviteCodeEntity entity) {
        if (!"active".equalsIgnoreCase(entity.getStatus())) {
            throw BizException.keyed(ResultCode.AUTH_INVITE_INVALID, "auth.invite.disabled");
        }
        if (entity.getExpiresAt() != null && !entity.getExpiresAt().isAfter(Instant.now())) {
            throw BizException.keyed(ResultCode.AUTH_INVITE_INVALID, "auth.invite.expired");
        }
        if (entity.getMaxUses() != null && entity.getMaxUses() > 0
            && entity.getUsedCount() != null && entity.getUsedCount() >= entity.getMaxUses()) {
            throw BizException.keyed(ResultCode.AUTH_INVITE_INVALID, "auth.invite.exhausted");
        }
    }

    @Transactional
    public void redeemAfterRegistration(InviteCodeEntity invite, long userId) {
        int updated = inviteCodeRepository.incrementUsedCountIfAvailable(invite.getId());
        if (updated == 0) {
            throw BizException.keyed(ResultCode.AUTH_INVITE_INVALID, "auth.invite.exhausted");
        }

        InviteRedemptionEntity redemption = new InviteRedemptionEntity();
        redemption.setId(IdWorker.getId());
        redemption.setInviteCodeId(invite.getId());
        redemption.setUserId(userId);
        inviteRedemptionRepository.save(redemption);

        billingAuditClient.logInviteRedeem(userId, invite.getId(), invite.getCode());
        inviteRewardApplier.apply(userId, invite.getRewardType(), invite.getRewardPayload(), invite.getCode());
    }

    public static String normalizeCode(String rawCode) {
        if (rawCode == null) {
            return null;
        }
        String trimmed = rawCode.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.toUpperCase(Locale.ROOT);
    }

    public static void validateRewardType(String rewardType) {
        if (rewardType == null || !ALLOWED_REWARD_TYPES.contains(rewardType)) {
            throw BizException.keyed(ResultCode.AUTH_INVITE_INVALID, "auth.invite.invalid_reward_type", rewardType);
        }
    }
}
