package cn.novelstudio.module.auth.service.invite;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ConditionalOnMissingBean(InviteRewardApplier.class)
public class NoOpInviteRewardApplier implements InviteRewardApplier {

    @Override
    public void apply(long userId, String rewardType, String rewardPayloadJson, String inviteCode) {
        if (rewardType == null || rewardType.isBlank() || "none".equalsIgnoreCase(rewardType)) {
            return;
        }
        log.debug("invite reward applier stub: userId={} rewardType={}", userId, rewardType);
    }
}
