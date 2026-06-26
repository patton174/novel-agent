package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.kernel.base.Page;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.module.billing.dto.PaymentOrderActionReq;
import cn.novelstudio.module.billing.dto.PaymentOrderCrmDetailResp;
import cn.novelstudio.module.billing.dto.PaymentOrderCrmResp;
import cn.novelstudio.module.billing.entity.PaymentOrderEntity;
import cn.novelstudio.module.billing.entity.ProductPlanEntity;
import cn.novelstudio.module.billing.integration.idatariver.IDataRiverClient;
import cn.novelstudio.module.billing.repository.PaymentOrderRepository;
import cn.novelstudio.module.billing.repository.ProductPlanRepository;
import cn.novelstudio.module.billing.service.AuditLogService;
import cn.novelstudio.module.billing.service.PaymentOrderSyncService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class PaymentOrderCrmBiz extends BaseBiz {

    private static final Logger log = LoggerFactory.getLogger(PaymentOrderCrmBiz.class);

    private final PaymentOrderRepository paymentOrderRepository;
    private final ProductPlanRepository productPlanRepository;
    private final IDataRiverClient client;
    private final PaymentOrderSyncService paymentOrderSyncService;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    public Result<Page<PaymentOrderCrmResp>> page(
        String status,
        Long userId,
        Long planId,
        String planCode,
        String orderQuery,
        int pageCurrent,
        int pageSize
    ) {
        var pageable = PageRequest.of(
            Math.max(pageCurrent - 1, 0),
            Math.max(pageSize, 1),
            Sort.by(Sort.Direction.DESC, "createdAt")
        );
        var page = paymentOrderRepository.search(
            trimToNull(status),
            userId,
            planId,
            trimToNull(planCode),
            trimToNull(orderQuery),
            pageable
        );
        List<PaymentOrderCrmResp> list = page.getContent().stream().map(this::toCrmResp).toList();
        return ok(Page.of(list, page.getTotalElements(), pageCurrent, pageSize));
    }

    public Result<PaymentOrderCrmDetailResp> detail(long orderId, boolean syncRemote) {
        PaymentOrderEntity entity = requireOrder(orderId);
        JsonNode remote = syncRemote ? fetchRemote(entity.getIdrOrderId()) : null;
        if (remote != null) {
            paymentOrderSyncService.syncFromRemote(entity, remote);
            paymentOrderRepository.save(entity);
        }
        return ok(toDetailResp(entity, remote));
    }

    @Transactional
    public Result<PaymentOrderCrmDetailResp> syncRemote(long orderId, Long actorId) {
        PaymentOrderEntity entity = requireOrder(orderId);
        PaymentOrderCrmDetailResp before = toDetailResp(entity, null);
        JsonNode remote = fetchRemoteRequired(entity.getIdrOrderId());
        paymentOrderSyncService.syncFromRemote(entity, remote);
        paymentOrderRepository.save(entity);
        PaymentOrderCrmDetailResp after = toDetailResp(entity, remote);
        auditLogService.log(actorId, "payment_order.sync", "payment_order", String.valueOf(orderId), before, after);
        return ok(after);
    }

    @Transactional
    public Result<PaymentOrderCrmDetailResp> fulfill(long orderId, Long actorId, PaymentOrderActionReq req) {
        PaymentOrderEntity entity = requireOrder(orderId);
        if ("REFUND".equals(entity.getStatus())) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "payment.order.refunded_no_fulfill");
        }
        PaymentOrderCrmDetailResp before = toDetailResp(entity, null);
        String reason = buildReason("admin-fulfill", req);
        paymentOrderSyncService.markPaid(entity, actorId, reason);
        paymentOrderRepository.save(entity);
        PaymentOrderCrmDetailResp after = toDetailResp(entity, null);
        auditLogService.log(actorId, "payment_order.fulfill", "payment_order", String.valueOf(orderId), before, after);
        return ok(after);
    }

    @Transactional
    public Result<PaymentOrderCrmDetailResp> expire(long orderId, Long actorId, PaymentOrderActionReq req) {
        PaymentOrderEntity entity = requireOrder(orderId);
        if ("DONE".equals(entity.getStatus())) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "payment.order.paid_no_close");
        }
        PaymentOrderCrmDetailResp before = toDetailResp(entity, null);
        entity.setStatus("EXPIRED");
        paymentOrderRepository.save(entity);
        PaymentOrderCrmDetailResp after = toDetailResp(entity, null);
        auditLogService.log(
            actorId,
            "payment_order.expire",
            "payment_order",
            String.valueOf(orderId),
            before,
            after
        );
        return ok(after);
    }

    public PaymentOrderCrmResp toCrmResp(PaymentOrderEntity entity) {
        String planName = entity.getPlanName();
        if (planName == null || planName.isBlank()) {
            planName = resolvePlanName(entity.getPlanCode());
        }
        return new PaymentOrderCrmResp(
            entity.getId(),
            entity.getUserId(),
            entity.getPlanId(),
            entity.getPlanCode(),
            planName,
            entity.getIdrSkuId(),
            entity.getIdrProjectId(),
            entity.getIdrOrderId(),
            entity.getStatus(),
            entity.getPayMethod(),
            entity.getAmountCents(),
            entity.getCurrency(),
            entity.getPayUrl(),
            entity.getPaidAt(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private PaymentOrderCrmDetailResp toDetailResp(PaymentOrderEntity entity, JsonNode remote) {
        PaymentOrderCrmResp base = toCrmResp(entity);
        Map<String, Object> remoteSnapshot = remote == null ? null : jsonToMap(remote);
        String remoteStatus = remote == null ? null : PaymentOrderSyncService.normalizeStatus(client.orderStatus(remote));
        return new PaymentOrderCrmDetailResp(
            base.id(),
            base.userId(),
            base.planId(),
            base.planCode(),
            base.planName(),
            base.idrSkuId(),
            base.idrProjectId(),
            base.idrOrderId(),
            base.status(),
            base.payMethod(),
            entity.getContactInfo(),
            base.amountCents(),
            base.currency(),
            base.payUrl(),
            base.paidAt(),
            base.createdAt(),
            base.updatedAt(),
            entity.getCallbackJson(),
            remoteStatus,
            remoteSnapshot
        );
    }

    private String resolvePlanName(String planCode) {
        return productPlanRepository.findByCode(planCode)
            .map(ProductPlanEntity::getName)
            .orElse(planCode);
    }

    private PaymentOrderEntity requireOrder(long orderId) {
        return paymentOrderRepository.findById(orderId)
            .orElseThrow(() -> NotFoundException.keyed("payment.order.not_found"));
    }

    private JsonNode fetchRemote(String idrOrderId) {
        if (!client.isConfigured()) {
            return null;
        }
        try {
            return client.getOrderInfo(idrOrderId);
        } catch (Exception ex) {
            log.debug("fetch remote order {} failed: {}", idrOrderId, ex.getMessage());
            return null;
        }
    }

    private JsonNode fetchRemoteRequired(String idrOrderId) {
        if (!client.isConfigured()) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "payment.order.sync_not_configured");
        }
        return client.getOrderInfo(idrOrderId);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> jsonToMap(JsonNode node) {
        return objectMapper.convertValue(node, Map.class);
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String buildReason(String prefix, PaymentOrderActionReq req) {
        if (req == null || req.reason() == null || req.reason().isBlank()) {
            return prefix;
        }
        return prefix + ":" + req.reason().trim();
    }
}
