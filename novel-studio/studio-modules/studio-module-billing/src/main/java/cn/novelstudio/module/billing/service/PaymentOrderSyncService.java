package cn.novelstudio.module.billing.service;

import cn.novelstudio.module.billing.entity.PaymentOrderEntity;
import cn.novelstudio.module.billing.integration.idatariver.IDataRiverClient;
import cn.novelstudio.module.billing.service.biz.SubscriptionBiz;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class PaymentOrderSyncService {

    private final IDataRiverClient client;
    private final SubscriptionBiz subscriptionBiz;

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
    }

    public static String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "NEW";
        }
        return status.trim().toUpperCase();
    }
}
