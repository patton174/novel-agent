package cn.novelstudio.module.auth.client;

import cn.novelstudio.module.auth.config.AuthIntegrationProperties;
import cn.novelstudio.module.billing.service.biz.SubscriptionBiz;
import cn.novelstudio.module.billing.service.biz.UsageCrmBiz;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class BillingInviteRewardClientTest {

    @Mock
    private UsageCrmBiz usageCrmBiz;

    @Mock
    private SubscriptionBiz subscriptionBiz;

    private AuthIntegrationProperties integrationProperties;
    private BillingInviteRewardClient client;

    @BeforeEach
    void setUp() {
        integrationProperties = new AuthIntegrationProperties();
        integrationProperties.getBilling().setEnabled(true);
        client = new BillingInviteRewardClient(
            integrationProperties,
            usageCrmBiz,
            subscriptionBiz,
            new ObjectMapper()
        );
    }

    @Test
    void applyQuotaBonusParsesPayloadAndGrantsQuota() {
        String payload = "{\"tokenBonus\":50000,\"runBonus\":5,\"days\":30}";

        client.apply(42L, "quota_bonus", payload, "na-inv-test");

        ArgumentCaptor<Instant> expiresCaptor = ArgumentCaptor.forClass(Instant.class);
        verify(usageCrmBiz).grantQuotaBonusFromGift(
            eq(42L),
            eq(50000L),
            eq(5),
            expiresCaptor.capture(),
            eq("invite:code:NA-INV-TEST"),
            eq(42L)
        );
        assertThat(expiresCaptor.getValue()).isAfter(Instant.now().plus(29, java.time.temporal.ChronoUnit.DAYS));
        verify(subscriptionBiz, never()).changeUserPlan(anyLong(), any(), anyLong(), any());
    }

    @Test
    void applyPlanTrialChangesSubscription() {
        String payload = "{\"planCode\":\"pro\",\"days\":14}";

        client.apply(7L, "plan_trial", payload, "NA-INV-PRO");

        verify(subscriptionBiz).changeUserPlan(7L, "pro", 7L, "invite:code:NA-INV-PRO");
        verify(usageCrmBiz, never()).grantQuotaBonusFromGift(
            anyLong(),
            anyLong(),
            anyInt(),
            any(),
            any(),
            any()
        );
    }

    @Test
    void applyUsesFallbackReasonWhenInviteCodeMissing() {
        client.apply(9L, "plan_trial", "{\"planCode\":\"hobby\"}", null);

        verify(subscriptionBiz).changeUserPlan(9L, "hobby", 9L, "invite:reward");
    }

    @Test
    void applySkipsWhenRewardTypeNone() {
        client.apply(1L, "none", "{\"tokenBonus\":1}", "NA-INV-NONE");

        verify(usageCrmBiz, never()).grantQuotaBonusFromGift(
            anyLong(),
            anyLong(),
            anyInt(),
            any(),
            any(),
            any()
        );
        verify(subscriptionBiz, never()).changeUserPlan(anyLong(), any(), anyLong(), any());
    }

    @Test
    void applySkipsWhenBillingDisabled() {
        integrationProperties.getBilling().setEnabled(false);

        client.apply(1L, "quota_bonus", "{\"tokenBonus\":1000}", "NA-INV-OFF");

        verify(usageCrmBiz, never()).grantQuotaBonusFromGift(
            anyLong(),
            anyLong(),
            anyInt(),
            any(),
            any(),
            any()
        );
    }
}
