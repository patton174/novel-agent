package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.entity.UpgradeRequestEntity;
import cn.novelstudio.module.billing.repository.UpgradeRequestRepository;
import cn.novelstudio.module.billing.service.AuditLogService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UpgradeRequestBizTest {

    @Mock
    UpgradeRequestRepository repo;
    @Mock
    SubscriptionBiz subscriptionBiz;
    @Mock
    UsageCrmBiz usageCrmBiz;
    @Mock
    AuditLogService auditLogService;
    @Spy
    ObjectMapper objectMapper = new ObjectMapper();
    @InjectMocks
    UpgradeRequestBiz biz;

    @Test
    void approve_plan_changesPlan() {
        UpgradeRequestEntity request = new UpgradeRequestEntity();
        request.setId("r1");
        request.setUserId(10L);
        request.setRequestType("plan");
        request.setTargetValue("pro");
        request.setStatus("pending");
        when(repo.findById("r1")).thenReturn(Optional.of(request));
        biz.approve("r1", 1L, "ok");
        verify(subscriptionBiz).changeUserPlan(eq(10L), eq("pro"), eq(1L), anyString());
        assertThat(request.getStatus()).isEqualTo("approved");
    }

    @Test
    void reject_setsStatus() {
        UpgradeRequestEntity request = new UpgradeRequestEntity();
        request.setId("r2");
        request.setUserId(10L);
        request.setStatus("pending");
        when(repo.findById("r2")).thenReturn(Optional.of(request));
        biz.reject("r2", 1L, "no");
        assertThat(request.getStatus()).isEqualTo("rejected");
    }
}
