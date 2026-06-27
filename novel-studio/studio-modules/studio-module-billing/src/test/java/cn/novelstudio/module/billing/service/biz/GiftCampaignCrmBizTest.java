package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.dto.GiftCampaignCrmResp;
import cn.novelstudio.module.billing.dto.GiftCodeCrmResp;
import cn.novelstudio.module.billing.entity.GiftCampaignEntity;
import cn.novelstudio.module.billing.entity.GiftRedemptionEntity;
import cn.novelstudio.module.billing.repository.GiftCampaignRepository;
import cn.novelstudio.module.billing.repository.GiftRedemptionRepository;
import cn.novelstudio.module.billing.service.AuditLogService;
import cn.novelstudio.module.billing.support.GiftCampaignSupport;
import cn.novelstudio.kernel.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GiftCampaignCrmBizTest {

    private GiftCampaignRepository giftCampaignRepository;
    private GiftRedemptionRepository giftRedemptionRepository;
    private AuditLogService auditLogService;
    private GiftCampaignCrmBiz giftCampaignCrmBiz;

    @BeforeEach
    void setUp() {
        giftCampaignRepository = mock(GiftCampaignRepository.class);
        giftRedemptionRepository = mock(GiftRedemptionRepository.class);
        auditLogService = mock(AuditLogService.class);
        giftCampaignCrmBiz = new GiftCampaignCrmBiz(
            giftCampaignRepository,
            giftRedemptionRepository,
            auditLogService
        );
    }

    @Test
    void deactivate_setsDisabledAndReturnsCampaign() {
        GiftCampaignEntity entity = activeCampaign(7L);
        when(giftCampaignRepository.findById(7L)).thenReturn(Optional.of(entity));
        when(giftCampaignRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        GiftCampaignCrmResp resp = giftCampaignCrmBiz.deactivate(7L, 99L).data();

        assertThat(resp.id()).isEqualTo(7L);
        assertThat(resp.status()).isEqualTo(GiftCampaignSupport.STATUS_DISABLED);
        verify(auditLogService).log(
            eq(99L),
            eq("gift.campaign.disable"),
            eq("gift_campaign"),
            eq("7"),
            any(),
            any()
        );
    }

    @Test
    void listCodes_returnsMappedRowsForCampaign() {
        GiftCampaignEntity campaign = activeCampaign(3L);
        when(giftCampaignRepository.findById(3L)).thenReturn(Optional.of(campaign));

        GiftRedemptionEntity available = redemption(11L, 3L, "GIFT-AAAA-BBBB", null, null);
        GiftRedemptionEntity redeemed = redemption(12L, 3L, "GIFT-CCCC-DDDD", 42L, Instant.parse("2026-06-01T10:00:00Z"));
        when(giftRedemptionRepository.findByCampaignIdOrderByCreatedAtDesc(3L))
            .thenReturn(List.of(redeemed, available));

        List<GiftCodeCrmResp> codes = giftCampaignCrmBiz.listCodes(3L).data();

        assertThat(codes).hasSize(2);
        assertThat(codes.get(0).code()).isEqualTo("GIFT-CCCC-DDDD");
        assertThat(codes.get(0).userId()).isEqualTo("42");
        assertThat(codes.get(0).redeemedAt()).isEqualTo(Instant.parse("2026-06-01T10:00:00Z"));
        assertThat(codes.get(1).code()).isEqualTo("GIFT-AAAA-BBBB");
        assertThat(codes.get(1).userId()).isNull();
    }

    @Test
    void listCodes_throwsWhenCampaignMissing() {
        when(giftCampaignRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> giftCampaignCrmBiz.listCodes(404L))
            .isInstanceOf(NotFoundException.class);
    }

    private static GiftCampaignEntity activeCampaign(long id) {
        GiftCampaignEntity entity = new GiftCampaignEntity();
        entity.setId(id);
        entity.setName("Launch promo");
        entity.setGiftType(GiftCampaignSupport.TYPE_QUOTA_BONUS);
        entity.setStatus(GiftCampaignSupport.STATUS_ACTIVE);
        entity.setConfigJson(Map.of("tokenBonus", 1000L));
        entity.setCodeCount(2);
        entity.setRedeemedCount(1);
        entity.setCreatedAt(Instant.parse("2026-06-01T00:00:00Z"));
        entity.setUpdatedAt(Instant.parse("2026-06-01T00:00:00Z"));
        return entity;
    }

    private static GiftRedemptionEntity redemption(
        long id,
        long campaignId,
        String code,
        Long userId,
        Instant redeemedAt
    ) {
        GiftRedemptionEntity entity = new GiftRedemptionEntity();
        entity.setId(id);
        entity.setCampaignId(campaignId);
        entity.setCode(code);
        entity.setStatus(userId == null ? GiftCampaignSupport.REDEMPTION_AVAILABLE : GiftCampaignSupport.REDEMPTION_REDEEMED);
        entity.setUserId(userId);
        entity.setRedeemedAt(redeemedAt);
        entity.setCreatedAt(Instant.parse("2026-06-01T09:00:00Z"));
        return entity;
    }
}
