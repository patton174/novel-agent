package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.dto.GiftRedeemReq;
import cn.novelstudio.module.billing.dto.GiftRedeemResp;
import cn.novelstudio.module.billing.entity.GiftCampaignEntity;
import cn.novelstudio.module.billing.entity.GiftRedemptionEntity;
import cn.novelstudio.module.billing.repository.GiftCampaignRepository;
import cn.novelstudio.module.billing.repository.GiftRedemptionRepository;
import cn.novelstudio.module.billing.service.AuditLogService;
import cn.novelstudio.module.billing.service.BillingRateLimitService;
import cn.novelstudio.module.billing.support.GiftCampaignSupport;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class GiftRedeemBiz extends BaseBiz {

    private static final int REDEEM_MAX_ATTEMPTS = 20;
    private static final Duration REDEEM_WINDOW = Duration.ofHours(1);

    private final GiftRedemptionRepository giftRedemptionRepository;
    private final GiftCampaignRepository giftCampaignRepository;
    private final UsageCrmBiz usageCrmBiz;
    private final SubscriptionBiz subscriptionBiz;
    private final AuditLogService auditLogService;
    private final BillingRateLimitService rateLimitService;

    @Transactional
    public Result<GiftRedeemResp> redeem(long userId, GiftRedeemReq req, String clientIp) {
        rateLimitService.checkComposite(
            "gift:redeem",
            clientIp,
            String.valueOf(userId),
            REDEEM_MAX_ATTEMPTS,
            REDEEM_WINDOW
        );

        String normalizedCode = normalizeCode(req.code());
        GiftRedemptionEntity redemption = giftRedemptionRepository.findByCode(normalizedCode)
            .orElseThrow(() -> invalidCode());

        GiftCampaignEntity campaign = giftCampaignRepository.findById(redemption.getCampaignId())
            .orElseThrow(() -> invalidCode());

        validateRedeemable(campaign, redemption, userId);

        Instant now = Instant.now();
        redemption.setUserId(userId);
        redemption.setStatus(GiftCampaignSupport.REDEMPTION_REDEEMED);
        redemption.setRedeemedAt(now);
        redemption.setFulfilledAt(now);

        GiftRedeemResp resp = fulfill(campaign, redemption, userId);
        giftRedemptionRepository.save(redemption);

        campaign.setRedeemedCount(campaign.getRedeemedCount() + 1);
        giftCampaignRepository.save(campaign);

        auditLogService.log(
            userId,
            "gift.redeem",
            "gift_redemption",
            String.valueOf(redemption.getId()),
            null,
            Map.of(
                "campaignId", campaign.getId(),
                "giftType", campaign.getGiftType(),
                "code", normalizedCode
            )
        );
        return ok(resp);
    }

    private GiftRedeemResp fulfill(GiftCampaignEntity campaign, GiftRedemptionEntity redemption, long userId) {
        Map<String, Object> config = campaign.getConfigJson();
        switch (campaign.getGiftType()) {
            case GiftCampaignSupport.TYPE_QUOTA_BONUS -> {
                long tokenBonus = GiftCampaignSupport.longFromConfig(config, "tokenBonus", 0L);
                int runBonus = GiftCampaignSupport.intFromConfig(config, "runBonus", 0);
                Instant overrideExpires = parseOverrideExpires(config);
                String reason = "gift:campaign:" + campaign.getId();
                usageCrmBiz.grantQuotaBonusFromGift(userId, tokenBonus, runBonus, overrideExpires, reason, userId);
                return new GiftRedeemResp(
                    campaign.getGiftType(),
                    campaign.getName(),
                    tokenBonus,
                    runBonus,
                    null,
                    null
                );
            }
            case GiftCampaignSupport.TYPE_PLAN_TRIAL -> {
                String planCode = GiftCampaignSupport.stringFromConfig(config, "planCode");
                String reason = "gift:campaign:" + campaign.getId();
                subscriptionBiz.changeUserPlan(userId, planCode, userId, reason);
                return new GiftRedeemResp(
                    campaign.getGiftType(),
                    campaign.getName(),
                    null,
                    null,
                    planCode,
                    null
                );
            }
            case GiftCampaignSupport.TYPE_LICENSE_KEY -> {
                String licenseKey = GiftCampaignSupport.stringFromConfig(redemption.getFulfillmentJson(), "licenseKey");
                if (licenseKey == null) {
                    throw BizException.keyed(ResultCode.ERROR, "billing.gift.fulfillment_failed");
                }
                return new GiftRedeemResp(
                    campaign.getGiftType(),
                    campaign.getName(),
                    null,
                    null,
                    null,
                    licenseKey
                );
            }
            default -> throw BizException.keyed(ResultCode.ERROR, "billing.gift.type_invalid");
        }
    }

    private void validateRedeemable(GiftCampaignEntity campaign, GiftRedemptionEntity redemption, long userId) {
        if (!GiftCampaignSupport.STATUS_ACTIVE.equals(campaign.getStatus())) {
            throw invalidCode();
        }
        if (campaign.getExpiresAt() != null && campaign.getExpiresAt().isBefore(Instant.now())) {
            throw invalidCode();
        }
        if (!GiftCampaignSupport.REDEMPTION_AVAILABLE.equals(redemption.getStatus())) {
            throw invalidCode();
        }
        if (giftRedemptionRepository.existsByCampaignIdAndUserIdAndStatus(
            campaign.getId(),
            userId,
            GiftCampaignSupport.REDEMPTION_REDEEMED
        )) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "billing.gift.already_redeemed_campaign");
        }
    }

    private static Instant parseOverrideExpires(Map<String, Object> config) {
        String raw = GiftCampaignSupport.stringFromConfig(config, "overrideExpiresAt");
        if (raw == null) {
            return null;
        }
        try {
            return Instant.parse(raw);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static String normalizeCode(String code) {
        if (code == null) {
            throw invalidCode();
        }
        String trimmed = code.trim().toUpperCase();
        if (trimmed.isEmpty()) {
            throw invalidCode();
        }
        return trimmed;
    }

    private static BizException invalidCode() {
        return BizException.keyed(ResultCode.BAD_REQUEST, "billing.gift.invalid_code");
    }
}
