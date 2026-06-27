package cn.novelstudio.module.auth.service.invite;

/**
 * Applies invite-code rewards after successful registration.
 * Billing module provides the production implementation (quota_bonus / plan_trial).
 */
public interface InviteRewardApplier {

    void apply(long userId, String rewardType, String rewardPayloadJson, String inviteCode);
}
