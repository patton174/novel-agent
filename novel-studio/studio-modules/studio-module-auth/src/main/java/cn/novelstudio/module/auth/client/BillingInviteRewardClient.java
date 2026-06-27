package cn.novelstudio.module.auth.client;

import cn.novelstudio.module.auth.config.AuthIntegrationProperties;
import cn.novelstudio.module.auth.service.invite.InviteRewardApplier;
import cn.novelstudio.module.billing.service.biz.SubscriptionBiz;
import cn.novelstudio.module.billing.service.biz.UsageCrmBiz;
import cn.novelstudio.module.billing.support.GiftCampaignSupport;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Component
@Primary
@RequiredArgsConstructor
public class BillingInviteRewardClient implements InviteRewardApplier {

    private final AuthIntegrationProperties integrationProperties;
    private final UsageCrmBiz usageCrmBiz;
    private final SubscriptionBiz subscriptionBiz;
    private final ObjectMapper objectMapper;

    @Override
    public void apply(long userId, String rewardType, String rewardPayloadJson, String inviteCode) {
        if (rewardType == null || rewardType.isBlank() || "none".equalsIgnoreCase(rewardType)) {
            return;
        }
        if (!integrationProperties.getBilling().isEnabled()) {
            log.debug("billing disabled; skip invite reward userId={} type={}", userId, rewardType);
            return;
        }

        String reason = buildReason(inviteCode);
        Map<String, Object> payload = parsePayload(rewardPayloadJson);

        switch (rewardType) {
            case GiftCampaignSupport.TYPE_QUOTA_BONUS -> fulfillQuotaBonus(userId, payload, reason);
            case GiftCampaignSupport.TYPE_PLAN_TRIAL -> fulfillPlanTrial(userId, payload, reason);
            default -> log.warn("unknown invite reward type userId={} type={}", userId, rewardType);
        }
    }

    private void fulfillQuotaBonus(long userId, Map<String, Object> payload, String reason) {
        long tokenBonus = GiftCampaignSupport.longFromConfig(payload, "tokenBonus", 0L);
        int runBonus = GiftCampaignSupport.intFromConfig(payload, "runBonus", 0);
        Instant expires = resolveExpires(payload);
        usageCrmBiz.grantQuotaBonusFromGift(userId, tokenBonus, runBonus, expires, reason, userId);
    }

    private void fulfillPlanTrial(long userId, Map<String, Object> payload, String reason) {
        String planCode = GiftCampaignSupport.stringFromConfig(payload, "planCode");
        subscriptionBiz.changeUserPlan(userId, planCode, userId, reason);
    }

    private static Instant resolveExpires(Map<String, Object> payload) {
        int days = GiftCampaignSupport.intFromConfig(payload, "days", 0);
        if (days <= 0) {
            return null;
        }
        return Instant.now().plus(days, ChronoUnit.DAYS);
    }

    private static String buildReason(String inviteCode) {
        if (inviteCode != null && !inviteCode.isBlank()) {
            return "invite:code:" + inviteCode.trim().toUpperCase(Locale.ROOT);
        }
        return "invite:reward";
    }

    private Map<String, Object> parsePayload(String rewardPayloadJson) {
        if (rewardPayloadJson == null || rewardPayloadJson.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(rewardPayloadJson, new TypeReference<>() {});
        } catch (Exception ex) {
            log.warn("failed to parse invite reward payload: {}", rewardPayloadJson, ex);
            return Map.of();
        }
    }
}
