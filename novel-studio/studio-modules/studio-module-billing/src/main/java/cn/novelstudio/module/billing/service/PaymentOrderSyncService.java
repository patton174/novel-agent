package cn.novelstudio.module.billing.service;

import cn.novelstudio.module.billing.client.NotificationClient;
import cn.novelstudio.module.billing.entity.PaymentOrderEntity;
import cn.novelstudio.module.billing.integration.idatariver.IDataRiverClient;
import cn.novelstudio.module.billing.service.biz.ReferralBiz;
import cn.novelstudio.module.billing.service.biz.SubscriptionBiz;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class PaymentOrderSyncService {

    private final IDataRiverClient client;
    private final SubscriptionBiz subscriptionBiz;
    private final ReferralBiz referralBiz;
    private final NotificationClient notificationClient;

    public PaymentOrderSyncService(
        IDataRiverClient client,
        SubscriptionBiz subscriptionBiz,
        ReferralBiz referralBiz,
        @Autowired(required = false) NotificationClient notificationClient
    ) {
        this.client = client;
        this.subscriptionBiz = subscriptionBiz;
        this.referralBiz = referralBiz;
        this.notificationClient = notificationClient;
    }

    public void syncFromRemote(PaymentOrderEntity entity, JsonNode remote) {
        String status = normalizeStatus(client.orderStatus(remote));
        entity.setStatus(status);
        if ("DONE".equals(status)) {
            markPaid(entity, entity.getUserId(), "idatariver:" + entity.getIdrOrderId());
        }
    }

    public void markPaid(PaymentOrderEntity entity, Long actorId, String reason) {
        if (entity.getPaidAt() != null) {
            return;
        }
        entity.setPaidAt(Instant.now());
        if (!"DONE".equals(entity.getStatus())) {
            entity.setStatus("DONE");
        }
        subscriptionBiz.changeUserPlanFromOrder(entity, actorId, reason);
        referralBiz.recordFirstPaidOrder(entity.getUserId(), entity.getId());
        if (notificationClient != null) {
            notificationClient.sendPaymentSuccess(entity.getUserId(), entity.getId());
        }
    }

    public static String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "NEW";
        }
        return status.trim().toUpperCase();
    }
}
