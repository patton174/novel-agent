package cn.novelstudio.module.auth.client;

import cn.novelstudio.module.auth.config.AuthIntegrationProperties;
import cn.novelstudio.module.billing.service.biz.ReferralBiz;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BillingReferralClient {

    private final ReferralBiz referralBiz;
    private final AuthIntegrationProperties integrationProperties;

    public void recordRegistrationAttribution(long referredUserId, String referralCode) {
        if (!integrationProperties.getBilling().isEnabled()) {
            return;
        }
        if (referralCode == null || referralCode.isBlank()) {
            return;
        }
        try {
            referralBiz.recordRegistrationAttribution(referredUserId, referralCode);
        } catch (Exception ex) {
            log.warn("referral attribution failed for user {}: {}", referredUserId, ex.getMessage());
        }
    }
}
