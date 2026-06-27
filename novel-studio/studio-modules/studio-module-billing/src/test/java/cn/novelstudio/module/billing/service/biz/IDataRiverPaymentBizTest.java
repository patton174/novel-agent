package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.config.IDataRiverProperties;
import cn.novelstudio.module.billing.dto.PayCheckoutReq;
import cn.novelstudio.module.billing.dto.PayCheckoutResp;
import cn.novelstudio.module.billing.entity.ProductPlanEntity;
import cn.novelstudio.module.billing.integration.idatariver.IDataRiverClient;
import cn.novelstudio.module.billing.repository.PaymentOrderRepository;
import cn.novelstudio.module.billing.service.IDataRiverConfigService;
import cn.novelstudio.module.billing.service.IDataRiverConfigService.EffectiveConfig;
import cn.novelstudio.module.billing.service.PaymentOrderSyncService;
import cn.novelstudio.module.billing.service.PaymentUserLookup;
import cn.novelstudio.platform.i18n.StudioMessages;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class IDataRiverPaymentBizTest {

    @Test
    void checkout_newOrder_passesCouponAndAffCodeToIdr() {
        IDataRiverConfigService configService = mock(IDataRiverConfigService.class);
        IDataRiverProperties envProperties = mock(IDataRiverProperties.class);
        IDataRiverClient client = mock(IDataRiverClient.class);
        PaymentOrderRepository paymentOrderRepository = mock(PaymentOrderRepository.class);
        PlanBiz planBiz = mock(PlanBiz.class);
        PaymentOrderSyncService paymentOrderSyncService = mock(PaymentOrderSyncService.class);
        StudioMessages messages = mock(StudioMessages.class);
        PaymentUserLookup paymentUserLookup = mock(PaymentUserLookup.class);

        EffectiveConfig effective = mock(EffectiveConfig.class);
        when(configService.effective()).thenReturn(effective);
        when(effective.getProjectId()).thenReturn("proj-1");
        when(client.isConfigured()).thenReturn(true);
        when(paymentOrderRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(anyLong(), eq("NEW")))
            .thenReturn(Optional.empty());

        ProductPlanEntity plan = new ProductPlanEntity();
        plan.setId(10L);
        plan.setCode("pro");
        plan.setName("Pro");
        plan.setPriceCents(9900);
        plan.setCurrency("CNY");
        plan.setIdrProjectId("proj-plan");
        plan.setIdrSkuId("sku-pro");
        when(planBiz.requireActivePlanByCode("pro")).thenReturn(plan);
        when(planBiz.localizedPlanName(plan)).thenReturn("Pro");

        ObjectNode remote = new ObjectMapper().createObjectNode();
        remote.put("status", "NEW");
        when(client.createOrder(eq("proj-plan"), eq("sku-pro"), any())).thenReturn("idr-order-1");
        when(client.getOrderInfo("idr-order-1")).thenReturn(remote);
        when(client.orderStatus(remote)).thenReturn("NEW");
        when(client.parsePaymentMethods(remote)).thenReturn(java.util.List.of());
        when(paymentOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        IDataRiverPaymentBiz biz = new IDataRiverPaymentBiz(
            configService,
            envProperties,
            client,
            paymentOrderRepository,
            planBiz,
            paymentOrderSyncService,
            messages,
            paymentUserLookup
        );

        PayCheckoutReq req = new PayCheckoutReq("pro", null, " SAVE10 ", " REF123 ");
        PayCheckoutResp resp = biz.checkout(42L, req).data();

        assertThat(resp.orderId()).isEqualTo("idr-order-1");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> orderInfoCaptor = ArgumentCaptor.forClass(Map.class);
        verify(client).createOrder(eq("proj-plan"), eq("sku-pro"), orderInfoCaptor.capture());
        Map<String, Object> orderInfo = orderInfoCaptor.getValue();
        assertThat(orderInfo.get("coupon")).isEqualTo("SAVE10");
        assertThat(orderInfo.get("affCode")).isEqualTo("REF123");
        assertThat(orderInfo.get("contactInfo")).isEqualTo("na-u-42");
        assertThat(orderInfo.get("quantity")).isEqualTo(1);
    }

    @Test
    void checkout_newOrder_usesEmptyStringsWhenCouponAndAffMissing() {
        IDataRiverConfigService configService = mock(IDataRiverConfigService.class);
        IDataRiverProperties envProperties = mock(IDataRiverProperties.class);
        IDataRiverClient client = mock(IDataRiverClient.class);
        PaymentOrderRepository paymentOrderRepository = mock(PaymentOrderRepository.class);
        PlanBiz planBiz = mock(PlanBiz.class);
        PaymentOrderSyncService paymentOrderSyncService = mock(PaymentOrderSyncService.class);
        StudioMessages messages = mock(StudioMessages.class);
        PaymentUserLookup paymentUserLookup = mock(PaymentUserLookup.class);

        EffectiveConfig effective = mock(EffectiveConfig.class);
        when(configService.effective()).thenReturn(effective);
        when(effective.getProjectId()).thenReturn("proj-1");
        when(client.isConfigured()).thenReturn(true);
        when(paymentOrderRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(anyLong(), eq("NEW")))
            .thenReturn(Optional.empty());

        ProductPlanEntity plan = new ProductPlanEntity();
        plan.setId(10L);
        plan.setCode("pro");
        plan.setName("Pro");
        plan.setPriceCents(9900);
        plan.setCurrency("CNY");
        plan.setIdrProjectId("proj-plan");
        plan.setIdrSkuId("sku-pro");
        when(planBiz.requireActivePlanByCode("pro")).thenReturn(plan);
        when(planBiz.localizedPlanName(plan)).thenReturn("Pro");

        ObjectNode remote = new ObjectMapper().createObjectNode();
        remote.put("status", "NEW");
        when(client.createOrder(anyString(), anyString(), any())).thenReturn("idr-order-2");
        when(client.getOrderInfo("idr-order-2")).thenReturn(remote);
        when(client.orderStatus(remote)).thenReturn("NEW");
        when(client.parsePaymentMethods(remote)).thenReturn(java.util.List.of());
        when(paymentOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        IDataRiverPaymentBiz biz = new IDataRiverPaymentBiz(
            configService,
            envProperties,
            client,
            paymentOrderRepository,
            planBiz,
            paymentOrderSyncService,
            messages,
            paymentUserLookup
        );

        biz.checkout(7L, new PayCheckoutReq("pro", null, null, null));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> orderInfoCaptor = ArgumentCaptor.forClass(Map.class);
        verify(client).createOrder(anyString(), anyString(), orderInfoCaptor.capture());
        assertThat(orderInfoCaptor.getValue().get("coupon")).isEqualTo("");
        assertThat(orderInfoCaptor.getValue().get("affCode")).isEqualTo("");
    }
}
