package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.billing.dto.ReferralStatsResp;
import cn.novelstudio.module.billing.dto.UserReferralResp;
import cn.novelstudio.module.billing.entity.ReferralAttributionEntity;
import cn.novelstudio.module.billing.entity.ReferralCodeEntity;
import cn.novelstudio.module.billing.repository.ReferralAttributionRepository;
import cn.novelstudio.module.billing.repository.ReferralCodeRepository;
import cn.novelstudio.module.billing.support.ReferralConstants;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReferralBizTest {

    @Mock
    private ReferralCodeRepository referralCodeRepository;

    @Mock
    private ReferralAttributionRepository referralAttributionRepository;

    @InjectMocks
    private ReferralBiz referralBiz;

    @Test
    void getUserReferral_returnsCodeAndCounts() {
        ReferralCodeEntity existing = new ReferralCodeEntity();
        existing.setUserId(10L);
        existing.setCode("abc123");
        when(referralCodeRepository.findByUserId(10L)).thenReturn(Optional.of(existing));
        when(referralAttributionRepository.countByReferrerUserId(10L)).thenReturn(3L);
        when(referralAttributionRepository.countByReferrerUserIdAndFirstPaidOrderIdIsNotNull(10L)).thenReturn(1L);

        Result<UserReferralResp> result = referralBiz.getUserReferral(10L);

        UserReferralResp data = result.data();
        assertThat(data.code()).isEqualTo("abc123");
        assertThat(data.referralLink()).isNull();
        assertThat(data.referralCount()).isEqualTo(3L);
        assertThat(data.paidCount()).isEqualTo(1L);
    }

    @Test
    void ensureReferralCode_returnsExistingCode() {
        ReferralCodeEntity existing = new ReferralCodeEntity();
        existing.setUserId(10L);
        existing.setCode("abc123");
        when(referralCodeRepository.findByUserId(10L)).thenReturn(Optional.of(existing));

        ReferralCodeEntity result = referralBiz.ensureReferralCode(10L);

        assertThat(result.getCode()).isEqualTo("abc123");
        verify(referralCodeRepository, never()).save(any());
    }

    @Test
    void ensureReferralCode_generatesUniqueCodeForNewUser() {
        when(referralCodeRepository.findByUserId(11L)).thenReturn(Optional.empty());
        when(referralCodeRepository.existsByCodeIgnoreCase(anyString())).thenReturn(false);
        when(referralCodeRepository.save(any(ReferralCodeEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        ReferralCodeEntity result = referralBiz.ensureReferralCode(11L);

        assertThat(result.getUserId()).isEqualTo(11L);
        assertThat(result.getCode()).hasSize(10);
        assertThat(result.getStatus()).isEqualTo(ReferralConstants.STATUS_ACTIVE);
    }

    @Test
    void recordRegistrationAttribution_persistsAttributionForValidCode() {
        ReferralCodeEntity code = new ReferralCodeEntity();
        code.setUserId(100L);
        code.setCode("shareme");
        code.setStatus(ReferralConstants.STATUS_ACTIVE);

        when(referralAttributionRepository.findByReferredUserId(200L)).thenReturn(Optional.empty());
        when(referralCodeRepository.findByCodeIgnoreCase("shareme")).thenReturn(Optional.of(code));
        when(referralAttributionRepository.save(any(ReferralAttributionEntity.class)))
            .thenAnswer(inv -> inv.getArgument(0));

        referralBiz.recordRegistrationAttribution(200L, " shareme ");

        ArgumentCaptor<ReferralAttributionEntity> captor = ArgumentCaptor.forClass(ReferralAttributionEntity.class);
        verify(referralAttributionRepository).save(captor.capture());
        ReferralAttributionEntity saved = captor.getValue();
        assertThat(saved.getReferrerUserId()).isEqualTo(100L);
        assertThat(saved.getReferredUserId()).isEqualTo(200L);
        assertThat(saved.getFirstTouchAt()).isNotNull();
        assertThat(saved.getRegisteredAt()).isNotNull();
    }

    @Test
    void recordRegistrationAttribution_skipsSelfReferral() {
        ReferralCodeEntity code = new ReferralCodeEntity();
        code.setUserId(300L);
        code.setCode("selfref");
        code.setStatus(ReferralConstants.STATUS_ACTIVE);

        when(referralAttributionRepository.findByReferredUserId(300L)).thenReturn(Optional.empty());
        when(referralCodeRepository.findByCodeIgnoreCase("selfref")).thenReturn(Optional.of(code));

        referralBiz.recordRegistrationAttribution(300L, "selfref");

        verify(referralAttributionRepository, never()).save(any());
    }

    @Test
    void recordRegistrationAttribution_skipsDuplicateAttribution() {
        when(referralAttributionRepository.findByReferredUserId(400L))
            .thenReturn(Optional.of(new ReferralAttributionEntity()));

        referralBiz.recordRegistrationAttribution(400L, "anycode");

        verify(referralCodeRepository, never()).findByCodeIgnoreCase(anyString());
        verify(referralAttributionRepository, never()).save(any());
    }

    @Test
    void listConversions_masksUserAndFlagsPaid() {
        ReferralAttributionEntity pending = new ReferralAttributionEntity();
        pending.setId(1L);
        pending.setReferredUserId(12_345L);
        pending.setRegisteredAt(Instant.parse("2026-01-02T08:00:00Z"));

        ReferralAttributionEntity paid = new ReferralAttributionEntity();
        paid.setId(2L);
        paid.setReferredUserId(98_765L);
        paid.setRegisteredAt(Instant.parse("2026-02-03T09:00:00Z"));
        paid.setFirstPaidOrderId(9001L);

        when(referralAttributionRepository.findByReferrerUserIdOrderByRegisteredAtDesc(10L))
            .thenReturn(List.of(pending, paid));

        var result = referralBiz.listConversions(10L).data();

        assertThat(result.items()).hasSize(2);
        assertThat(result.items().get(0).userLabel()).isEqualTo("***2345");
        assertThat(result.items().get(0).converted()).isFalse();
        assertThat(result.items().get(1).userLabel()).isEqualTo("***8765");
        assertThat(result.items().get(1).converted()).isTrue();
    }

    @Test
    void maskReferredUserLabel_shortIds() {
        assertThat(ReferralBiz.maskReferredUserLabel(42L)).isEqualTo("42");
        assertThat(ReferralBiz.maskReferredUserLabel(12345L)).isEqualTo("***2345");
    }

    @Test
    void recordFirstPaidOrder_setsOrderIdOnce() {
        ReferralAttributionEntity attribution = new ReferralAttributionEntity();
        attribution.setReferrerUserId(500L);
        attribution.setReferredUserId(600L);

        when(referralAttributionRepository.findByReferredUserId(600L)).thenReturn(Optional.of(attribution));
        when(referralAttributionRepository.save(attribution)).thenReturn(attribution);

        referralBiz.recordFirstPaidOrder(600L, 9001L);

        assertThat(attribution.getFirstPaidOrderId()).isEqualTo(9001L);
        verify(referralAttributionRepository).save(attribution);

        referralBiz.recordFirstPaidOrder(600L, 9002L);
        assertThat(attribution.getFirstPaidOrderId()).isEqualTo(9001L);
    }
}

@ExtendWith(MockitoExtension.class)
class ReferralCrmBizTest {

    @Mock
    private ReferralAttributionRepository referralAttributionRepository;

    @Mock
    private ReferralCodeRepository referralCodeRepository;

    @InjectMocks
    private ReferralCrmBiz referralCrmBiz;

    @Test
    void stats_aggregatesTopReferrersAndConversion() {
        when(referralAttributionRepository.summarizeByReferrer()).thenReturn(List.of(
            new Object[] { 1L, 4L, 2L },
            new Object[] { 2L, 2L, 0L }
        ));
        ReferralCodeEntity code1 = new ReferralCodeEntity();
        code1.setUserId(1L);
        code1.setCode("alpha");
        ReferralCodeEntity code2 = new ReferralCodeEntity();
        code2.setUserId(2L);
        code2.setCode("beta");
        when(referralCodeRepository.findAll()).thenReturn(List.of(code1, code2));

        ReferralStatsResp stats = referralCrmBiz.stats(10).data();

        assertThat(stats.totalSignups()).isEqualTo(6L);
        assertThat(stats.totalPaid()).isEqualTo(2L);
        assertThat(stats.overallConversionRate()).isCloseTo(2.0 / 6.0, org.assertj.core.data.Offset.offset(0.0001));
        assertThat(stats.topReferrers()).hasSize(2);
        assertThat(stats.topReferrers().getFirst().referralCode()).isEqualTo("alpha");
        assertThat(stats.topReferrers().getFirst().conversionRate()).isEqualTo(0.5);
    }
}
