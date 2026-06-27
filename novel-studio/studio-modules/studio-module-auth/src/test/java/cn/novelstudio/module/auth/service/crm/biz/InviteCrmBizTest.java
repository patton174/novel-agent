package cn.novelstudio.module.auth.service.crm.biz;

import cn.novelstudio.module.auth.client.BillingAuditClient;
import cn.novelstudio.module.auth.entity.InviteCodeEntity;
import cn.novelstudio.module.auth.repository.InviteCodeRepository;
import cn.novelstudio.module.auth.service.crm.req.InviteCrmUpdateReq;
import cn.novelstudio.module.auth.service.crm.resp.InviteCrmItemResp;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.exception.NotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class InviteCrmBizTest {

    private InviteCodeRepository inviteCodeRepository;
    private BillingAuditClient billingAuditClient;
    private InviteCrmBiz inviteCrmBiz;

    @BeforeEach
    void setUp() {
        inviteCodeRepository = mock(InviteCodeRepository.class);
        billingAuditClient = mock(BillingAuditClient.class);
        inviteCrmBiz = new InviteCrmBiz(
            inviteCodeRepository,
            billingAuditClient,
            new ObjectMapper()
        );
    }

    @Test
    void update_changesEditableFieldsAndLogsAudit() {
        InviteCodeEntity entity = activeInvite(10L, "NA-INV-OLD", 0);
        when(inviteCodeRepository.findById(10L)).thenReturn(Optional.of(entity));
        when(inviteCodeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        InviteCrmUpdateReq req = new InviteCrmUpdateReq(
            null,
            5,
            Instant.parse("2026-12-31T23:59:59Z"),
            "quota_bonus",
            Map.of("tokenBonus", 500, "runBonus", 10)
        );

        InviteCrmItemResp resp = inviteCrmBiz.update(10L, req, 99L).data();

        assertThat(resp.maxUses()).isEqualTo(5);
        assertThat(resp.expiresAt()).isEqualTo(Instant.parse("2026-12-31T23:59:59Z"));
        assertThat(resp.rewardType()).isEqualTo("quota_bonus");
        assertThat(resp.rewardPayload()).contains("tokenBonus");
        verify(billingAuditClient).logInviteUpdate(eq(99L), eq(10L), any(), any());
    }

    @Test
    void update_allowsCodeChangeWhenUnused() {
        InviteCodeEntity entity = activeInvite(11L, "NA-INV-OLD", 0);
        when(inviteCodeRepository.findById(11L)).thenReturn(Optional.of(entity));
        when(inviteCodeRepository.findByCodeIgnoreCase("NA-INV-NEW")).thenReturn(Optional.empty());
        when(inviteCodeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        InviteCrmUpdateReq req = new InviteCrmUpdateReq(
            "na-inv-new",
            1,
            null,
            "none",
            null
        );

        InviteCrmItemResp resp = inviteCrmBiz.update(11L, req, 1L).data();

        assertThat(resp.code()).isEqualTo("NA-INV-NEW");
    }

    @Test
    void update_rejectsCodeChangeWhenAlreadyUsed() {
        InviteCodeEntity entity = activeInvite(12L, "NA-INV-USED", 2);
        entity.setUsedCount(2);
        when(inviteCodeRepository.findById(12L)).thenReturn(Optional.of(entity));

        InviteCrmUpdateReq req = new InviteCrmUpdateReq(
            "NA-INV-NEW",
            5,
            null,
            "none",
            null
        );

        assertThatThrownBy(() -> inviteCrmBiz.update(12L, req, 1L))
            .isInstanceOf(BizException.class);
        verify(inviteCodeRepository, never()).save(any());
    }

    @Test
    void update_rejectsMaxUsesBelowUsedCount() {
        InviteCodeEntity entity = activeInvite(13L, "NA-INV-LIMIT", 0);
        entity.setUsedCount(3);
        when(inviteCodeRepository.findById(13L)).thenReturn(Optional.of(entity));

        InviteCrmUpdateReq req = new InviteCrmUpdateReq(
            null,
            2,
            null,
            "none",
            null
        );

        assertThatThrownBy(() -> inviteCrmBiz.update(13L, req, 1L))
            .isInstanceOf(BizException.class);
        verify(inviteCodeRepository, never()).save(any());
    }

    @Test
    void disable_setsDisabledAndLogsAudit() {
        InviteCodeEntity entity = activeInvite(20L, "NA-INV-DISABLE", 0);
        when(inviteCodeRepository.findById(20L)).thenReturn(Optional.of(entity));
        when(inviteCodeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        InviteCrmItemResp resp = inviteCrmBiz.disable(20L, 77L).data();

        assertThat(resp.status()).isEqualTo("disabled");
        verify(billingAuditClient).logInviteDisable(eq(77L), eq(20L), any(), any());
    }

    @Test
    void disable_isIdempotentWhenAlreadyDisabled() {
        InviteCodeEntity entity = activeInvite(21L, "NA-INV-OFF", 0);
        entity.setStatus("disabled");
        when(inviteCodeRepository.findById(21L)).thenReturn(Optional.of(entity));

        InviteCrmItemResp resp = inviteCrmBiz.disable(21L, 77L).data();

        assertThat(resp.status()).isEqualTo("disabled");
        verify(inviteCodeRepository, never()).save(any());
        verify(billingAuditClient, never()).logInviteDisable(any(Long.class), any(Long.class), any(), any());
    }

    @Test
    void update_throwsWhenInviteMissing() {
        when(inviteCodeRepository.findById(404L)).thenReturn(Optional.empty());

        InviteCrmUpdateReq req = new InviteCrmUpdateReq(null, 1, null, "none", null);

        assertThatThrownBy(() -> inviteCrmBiz.update(404L, req, 1L))
            .isInstanceOf(NotFoundException.class);
    }

    private static InviteCodeEntity activeInvite(long id, String code, int maxUses) {
        InviteCodeEntity entity = new InviteCodeEntity();
        entity.setId(id);
        entity.setCode(code);
        entity.setStatus("active");
        entity.setMaxUses(maxUses);
        entity.setUsedCount(0);
        entity.setRewardType("none");
        entity.setCreatedAt(Instant.parse("2026-06-01T00:00:00Z"));
        return entity;
    }
}
