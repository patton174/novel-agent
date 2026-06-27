package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.entity.RedemptionCodeEntity;
import cn.novelstudio.module.billing.repository.RedemptionCodeRepository;
import cn.novelstudio.module.billing.repository.RedemptionRecordRepository;
import cn.novelstudio.module.billing.service.AuditLogService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RedemptionBizTest {

    @Mock
    RedemptionCodeRepository codeRepo;
    @Mock
    RedemptionRecordRepository recordRepo;
    @Mock
    UserBalanceBiz balanceBiz;
    @Mock
    SubscriptionBiz subscriptionBiz;
    @Mock
    UsageCrmBiz usageCrmBiz;
    @Mock
    AuditLogService auditLogService;
    @Spy
    ObjectMapper objectMapper = new ObjectMapper();
    @InjectMocks
    RedemptionBiz biz;

    private RedemptionCodeEntity mk(String type, String value) {
        RedemptionCodeEntity code = new RedemptionCodeEntity();
        code.setId("c1");
        code.setCode("CODE1");
        code.setType(type);
        code.setValue(value);
        code.setMaxUses(1);
        code.setUsedCount(0);
        code.setExpiresAt(Instant.now().plusSeconds(3600));
        return code;
    }

    @Test
    void redeem_balance_creditsBalance() {
        when(codeRepo.findByCode("CODE1")).thenReturn(Optional.of(mk("balance", "5000")));
        when(codeRepo.consumeOne("c1")).thenReturn(1);
        when(recordRepo.existsByCodeIdAndUserId("c1", 10L)).thenReturn(false);
        String result = biz.redeem(10L, "CODE1");
        verify(balanceBiz).credit(10L, 5000L);
        assertThat(result).contains("5000");
    }

    @Test
    void redeem_alreadyRedeemed_throws() {
        when(codeRepo.findByCode("CODE1")).thenReturn(Optional.of(mk("balance", "5000")));
        when(recordRepo.existsByCodeIdAndUserId("c1", 10L)).thenReturn(true);
        assertThatThrownBy(() -> biz.redeem(10L, "CODE1"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void redeem_expired_throws() {
        RedemptionCodeEntity code = mk("balance", "5000");
        code.setExpiresAt(Instant.now().minusSeconds(60));
        when(codeRepo.findByCode("CODE1")).thenReturn(Optional.of(code));
        assertThatThrownBy(() -> biz.redeem(10L, "CODE1"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void redeem_plan_changesPlan() {
        when(codeRepo.findByCode("CODE1")).thenReturn(Optional.of(mk("plan", "pro")));
        when(codeRepo.consumeOne("c1")).thenReturn(1);
        when(recordRepo.existsByCodeIdAndUserId("c1", 10L)).thenReturn(false);
        biz.redeem(10L, "CODE1");
        verify(subscriptionBiz).changeUserPlan(eq(10L), eq("pro"), eq(10L), anyString());
    }
}
