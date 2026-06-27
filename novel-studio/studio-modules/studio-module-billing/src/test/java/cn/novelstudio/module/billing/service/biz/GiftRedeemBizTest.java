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
import cn.novelstudio.kernel.exception.BizException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GiftRedeemBizTest {

    private GiftRedemptionRepository giftRedemptionRepository;
    private GiftCampaignRepository giftCampaignRepository;
    private UsageCrmBiz usageCrmBiz;
    private SubscriptionBiz subscriptionBiz;
    private AuditLogService auditLogService;
    private BillingRateLimitService rateLimitService;
    private GiftRedeemBiz giftRedeemBiz;

    @BeforeEach
    void setUp() {
        giftRedemptionRepository = mock(GiftRedemptionRepository.class);
        giftCampaignRepository = mock(GiftCampaignRepository.class);
        usageCrmBiz = mock(UsageCrmBiz.class);
        subscriptionBiz = mock(SubscriptionBiz.class);
        auditLogService = mock(AuditLogService.class);
        rateLimitService = mock(BillingRateLimitService.class);
        giftRedeemBiz = new GiftRedeemBiz(
            giftRedemptionRepository,
            giftCampaignRepository,
            usageCrmBiz,
            subscriptionBiz,
            auditLogService,
            rateLimitService
        );
    }

    @Test
    void redeem_quotaBonus_grantsQuotaViaUsageCrmBiz() {
        GiftCampaignEntity campaign = activeCampaign(1L, GiftCampaignSupport.TYPE_QUOTA_BONUS, Map.of(
            "tokenBonus", 50000L,
            "runBonus", 5
        ));
        GiftRedemptionEntity redemption = availableRedemption(10L, 1L, "GIFT-ABCD-EFGH");

        when(giftRedemptionRepository.findByCode("GIFT-ABCD-EFGH")).thenReturn(Optional.of(redemption));
        when(giftCampaignRepository.findById(1L)).thenReturn(Optional.of(campaign));
        when(giftRedemptionRepository.existsByCampaignIdAndUserIdAndStatus(1L, 42L, "redeemed"))
            .thenReturn(false);
        when(giftCampaignRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(giftRedemptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        GiftRedeemResp resp = giftRedeemBiz.redeem(42L, new GiftRedeemReq("gift-abcd-efgh"), "127.0.0.1").data();

        assertThat(resp.giftType()).isEqualTo(GiftCampaignSupport.TYPE_QUOTA_BONUS);
        assertThat(resp.tokenBonus()).isEqualTo(50000L);
        assertThat(resp.runBonus()).isEqualTo(5);

        verify(usageCrmBiz).grantQuotaBonusFromGift(
            eq(42L),
            eq(50000L),
            eq(5),
            eq(null),
            eq("gift:campaign:1"),
            eq(42L)
        );
        verify(auditLogService).log(eq(42L), eq("gift.redeem"), eq("gift_redemption"), any(), eq(null), any());

        ArgumentCaptor<GiftRedemptionEntity> savedCaptor = ArgumentCaptor.forClass(GiftRedemptionEntity.class);
        verify(giftRedemptionRepository).save(savedCaptor.capture());
        assertThat(savedCaptor.getValue().getStatus()).isEqualTo(GiftCampaignSupport.REDEMPTION_REDEEMED);
        assertThat(savedCaptor.getValue().getUserId()).isEqualTo(42L);
    }

    @Test
    void redeem_planTrial_changesSubscription() {
        GiftCampaignEntity campaign = activeCampaign(2L, GiftCampaignSupport.TYPE_PLAN_TRIAL, Map.of("planCode", "pro"));
        GiftRedemptionEntity redemption = availableRedemption(11L, 2L, "GIFT-PLAN-TRIAL");

        when(giftRedemptionRepository.findByCode("GIFT-PLAN-TRIAL")).thenReturn(Optional.of(redemption));
        when(giftCampaignRepository.findById(2L)).thenReturn(Optional.of(campaign));
        when(giftRedemptionRepository.existsByCampaignIdAndUserIdAndStatus(2L, 7L, "redeemed"))
            .thenReturn(false);
        when(giftCampaignRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(giftRedemptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        GiftRedeemResp resp = giftRedeemBiz.redeem(7L, new GiftRedeemReq("GIFT-PLAN-TRIAL"), "10.0.0.1").data();

        assertThat(resp.planCode()).isEqualTo("pro");
        verify(subscriptionBiz).changeUserPlan(7L, "pro", 7L, "gift:campaign:2");
        verify(usageCrmBiz, never()).grantQuotaBonusFromGift(anyLong(), anyLong(), anyInt(), any(), any(), any());
    }

    @Test
    void redeem_licenseKey_returnsPreassignedKey() {
        GiftCampaignEntity campaign = activeCampaign(3L, GiftCampaignSupport.TYPE_LICENSE_KEY, Map.of());
        GiftRedemptionEntity redemption = availableRedemption(12L, 3L, "GIFT-LICENSE-01");
        redemption.setFulfillmentJson(Map.of("licenseKey", "NA-ABCD-EFGH-IJKL"));

        when(giftRedemptionRepository.findByCode("GIFT-LICENSE-01")).thenReturn(Optional.of(redemption));
        when(giftCampaignRepository.findById(3L)).thenReturn(Optional.of(campaign));
        when(giftRedemptionRepository.existsByCampaignIdAndUserIdAndStatus(3L, 9L, "redeemed"))
            .thenReturn(false);
        when(giftCampaignRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(giftRedemptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        GiftRedeemResp resp = giftRedeemBiz.redeem(9L, new GiftRedeemReq("GIFT-LICENSE-01"), "10.0.0.2").data();

        assertThat(resp.licenseKey()).isEqualTo("NA-ABCD-EFGH-IJKL");
    }

    @Test
    void redeem_unknownCode_throwsInvalidCode() {
        when(giftRedemptionRepository.findByCode("GIFT-NOT-FOUND")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> giftRedeemBiz.redeem(1L, new GiftRedeemReq("GIFT-NOT-FOUND"), "127.0.0.1"))
            .isInstanceOf(BizException.class)
            .hasMessageContaining("billing.gift.invalid_code");
    }

    @Test
    void redeem_alreadyUsedCode_throwsInvalidCode() {
        GiftCampaignEntity campaign = activeCampaign(4L, GiftCampaignSupport.TYPE_QUOTA_BONUS, Map.of("tokenBonus", 1L));
        GiftRedemptionEntity redemption = availableRedemption(13L, 4L, "GIFT-USED-CODE");
        redemption.setStatus(GiftCampaignSupport.REDEMPTION_REDEEMED);

        when(giftRedemptionRepository.findByCode("GIFT-USED-CODE")).thenReturn(Optional.of(redemption));
        when(giftCampaignRepository.findById(4L)).thenReturn(Optional.of(campaign));

        assertThatThrownBy(() -> giftRedeemBiz.redeem(5L, new GiftRedeemReq("GIFT-USED-CODE"), "127.0.0.1"))
            .isInstanceOf(BizException.class)
            .hasMessageContaining("billing.gift.invalid_code");
    }

    private static GiftCampaignEntity activeCampaign(long id, String giftType, Map<String, Object> config) {
        GiftCampaignEntity campaign = new GiftCampaignEntity();
        campaign.setId(id);
        campaign.setName("Test Campaign");
        campaign.setGiftType(giftType);
        campaign.setStatus(GiftCampaignSupport.STATUS_ACTIVE);
        campaign.setConfigJson(new HashMap<>(config));
        campaign.setRedeemedCount(0);
        return campaign;
    }

    private static GiftRedemptionEntity availableRedemption(long id, long campaignId, String code) {
        GiftRedemptionEntity redemption = new GiftRedemptionEntity();
        redemption.setId(id);
        redemption.setCampaignId(campaignId);
        redemption.setCode(code);
        redemption.setStatus(GiftCampaignSupport.REDEMPTION_AVAILABLE);
        return redemption;
    }
}
