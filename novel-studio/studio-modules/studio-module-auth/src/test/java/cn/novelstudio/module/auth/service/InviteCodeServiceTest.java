package cn.novelstudio.module.auth.service;

import cn.novelstudio.module.auth.entity.InviteCodeEntity;
import cn.novelstudio.module.auth.entity.InviteRedemptionEntity;
import cn.novelstudio.module.auth.repository.InviteCodeRepository;
import cn.novelstudio.module.auth.repository.InviteRedemptionRepository;
import cn.novelstudio.module.auth.service.invite.InviteRewardApplier;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InviteCodeServiceTest {

    @Mock
    private InviteCodeRepository inviteCodeRepository;

    @Mock
    private InviteRedemptionRepository inviteRedemptionRepository;

    @Mock
    private InviteRewardApplier inviteRewardApplier;

    private InviteCodeService service;

    @BeforeEach
    void setUp() {
        service = new InviteCodeService(
            inviteCodeRepository,
            inviteRedemptionRepository,
            inviteRewardApplier,
            mock(cn.novelstudio.module.auth.client.BillingAuditClient.class)
        );
    }

    @Test
    void normalizeCodeTrimsAndUppercases() {
        assertEquals("NA-INV-ABC", InviteCodeService.normalizeCode("  na-inv-abc  "));
    }

    @Test
    void requireValidForRegistrationRejectsDisabledCode() {
        InviteCodeEntity entity = activeInvite("NA-INV-DISABLED");
        entity.setStatus("disabled");
        when(inviteCodeRepository.findByCodeIgnoreCase("NA-INV-DISABLED")).thenReturn(Optional.of(entity));

        BizException ex = assertThrows(BizException.class, () -> service.requireValidForRegistration("na-inv-disabled"));
        assertEquals(ResultCode.AUTH_INVITE_INVALID.getCode(), ex.getCode());
    }

    @Test
    void requireValidForRegistrationRejectsExpiredCode() {
        InviteCodeEntity entity = activeInvite("NA-INV-OLD");
        entity.setExpiresAt(Instant.now().minus(1, ChronoUnit.HOURS));
        when(inviteCodeRepository.findByCodeIgnoreCase("NA-INV-OLD")).thenReturn(Optional.of(entity));

        BizException ex = assertThrows(BizException.class, () -> service.requireValidForRegistration("NA-INV-OLD"));
        assertEquals(ResultCode.AUTH_INVITE_INVALID.getCode(), ex.getCode());
    }

    @Test
    void requireValidForRegistrationRejectsExhaustedCode() {
        InviteCodeEntity entity = activeInvite("NA-INV-FULL");
        entity.setMaxUses(1);
        entity.setUsedCount(1);
        when(inviteCodeRepository.findByCodeIgnoreCase("NA-INV-FULL")).thenReturn(Optional.of(entity));

        BizException ex = assertThrows(BizException.class, () -> service.requireValidForRegistration("NA-INV-FULL"));
        assertEquals(ResultCode.AUTH_INVITE_INVALID.getCode(), ex.getCode());
    }

    @Test
    void redeemAfterRegistrationIncrementsAndAppliesReward() {
        InviteCodeEntity entity = activeInvite("NA-INV-OK");
        entity.setId(100L);
        entity.setRewardType("quota_bonus");
        entity.setRewardPayload("{\"tokenBonus\":1000,\"runBonus\":2}");
        when(inviteCodeRepository.incrementUsedCountIfAvailable(100L)).thenReturn(1);

        service.redeemAfterRegistration(entity, 42L);

        ArgumentCaptor<InviteRedemptionEntity> captor = ArgumentCaptor.forClass(InviteRedemptionEntity.class);
        verify(inviteRedemptionRepository).save(captor.capture());
        assertEquals(100L, captor.getValue().getInviteCodeId());
        assertEquals(42L, captor.getValue().getUserId());
        verify(inviteRewardApplier).apply(
            42L,
            "quota_bonus",
            "{\"tokenBonus\":1000,\"runBonus\":2}",
            "NA-INV-OK"
        );
    }

    @Test
    void redeemAfterRegistrationSkipsRewardForNone() {
        InviteCodeEntity entity = activeInvite("NA-INV-NONE");
        entity.setId(101L);
        entity.setRewardType("none");
        when(inviteCodeRepository.incrementUsedCountIfAvailable(101L)).thenReturn(1);

        service.redeemAfterRegistration(entity, 7L);

        verify(inviteRedemptionRepository).save(any(InviteRedemptionEntity.class));
        verify(inviteRewardApplier).apply(7L, "none", null, "NA-INV-NONE");
    }

    @Test
    void redeemAfterRegistrationFailsWhenIncrementReturnsZero() {
        InviteCodeEntity entity = activeInvite("NA-INV-RACE");
        entity.setId(102L);
        when(inviteCodeRepository.incrementUsedCountIfAvailable(102L)).thenReturn(0);

        BizException ex = assertThrows(BizException.class, () -> service.redeemAfterRegistration(entity, 9L));
        assertEquals(ResultCode.AUTH_INVITE_INVALID.getCode(), ex.getCode());
        verify(inviteRedemptionRepository, never()).save(any());
        verify(inviteRewardApplier, never()).apply(eq(9L), any(), any(), any());
    }

    private static InviteCodeEntity activeInvite(String code) {
        InviteCodeEntity entity = new InviteCodeEntity();
        entity.setCode(code);
        entity.setStatus("active");
        entity.setMaxUses(1);
        entity.setUsedCount(0);
        entity.setRewardType("none");
        return entity;
    }
}
