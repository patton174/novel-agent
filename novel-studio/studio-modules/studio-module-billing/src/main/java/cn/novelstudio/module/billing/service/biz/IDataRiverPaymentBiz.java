package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.module.billing.config.IDataRiverProperties;
import cn.novelstudio.module.billing.service.IDataRiverConfigService;
import cn.novelstudio.module.billing.dto.PayCheckoutReq;
import cn.novelstudio.module.billing.dto.PayCheckoutResp;
import cn.novelstudio.module.billing.dto.PayPendingResp;
import cn.novelstudio.module.billing.dto.PayOrderStatusResp;
import cn.novelstudio.module.billing.dto.PayStartReq;
import cn.novelstudio.module.billing.dto.PayStartResp;
import cn.novelstudio.module.billing.entity.PaymentOrderEntity;
import cn.novelstudio.module.billing.entity.ProductPlanEntity;
import cn.novelstudio.module.billing.integration.idatariver.IDataRiverClient;
import cn.novelstudio.module.billing.integration.idatariver.IdrOrderSnapshot;
import cn.novelstudio.platform.idr.model.PayOrderResult;
import cn.novelstudio.module.billing.repository.PaymentOrderRepository;
import cn.novelstudio.module.billing.service.PaymentOrderSyncService;
import cn.novelstudio.module.billing.service.PaymentUserResolver;
import cn.novelstudio.module.billing.support.PlanPaymentSupport;
import cn.novelstudio.platform.i18n.StudioMessages;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class IDataRiverPaymentBiz extends BaseBiz {

    private static final Logger log = LoggerFactory.getLogger(IDataRiverPaymentBiz.class);

    private final IDataRiverConfigService configService;
    private final IDataRiverProperties envProperties;
    private final IDataRiverClient client;
    private final PaymentOrderRepository paymentOrderRepository;
    private final PlanBiz planBiz;
    private final PaymentOrderSyncService paymentOrderSyncService;
    private final StudioMessages messages;
    private final PaymentUserResolver paymentUserResolver;

    @Transactional
    public Result<PayCheckoutResp> checkout(long userId, PayCheckoutReq req) {
        requireConfigured();

        String explicitOrderId = req.orderId();
        if (explicitOrderId != null && !explicitOrderId.isBlank()) {
            return ok(loadExistingCheckout(userId, explicitOrderId.trim(), true));
        }

        if (req.planCode() == null || req.planCode().isBlank()) {
            throw ValidationException.keyed(ResultCode.BAD_REQUEST, "validation.billing.plan_code_required");
        }

        Optional<PaymentOrderEntity> pending = paymentOrderRepository
            .findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "NEW");
        if (pending.isPresent()) {
            PayCheckoutResp resumed = tryResumeCheckout(userId, pending.get());
            if (resumed != null) {
                return ok(resumed);
            }
        }

        return ok(createNewCheckout(userId, req.planCode()));
    }

    private PayCheckoutResp tryResumeCheckout(long userId, PaymentOrderEntity entity) {
        if (!entity.getUserId().equals(userId)) {
            return null;
        }
        JsonNode remote = client.getOrderInfo(entity.getIdrOrderId());
        syncFromRemote(entity, remote);
        paymentOrderRepository.save(entity);
        if (isTerminalUnpaidStatus(entity.getStatus())) {
            return null;
        }
        ProductPlanEntity plan = resolvePlanForOrder(entity);
        return toCheckoutResp(entity, plan, remote, true);
    }

    private PayCheckoutResp loadExistingCheckout(long userId, String idrOrderId, boolean resumed) {
        PaymentOrderEntity entity = paymentOrderRepository.findByIdrOrderId(idrOrderId)
            .orElseThrow(() -> ValidationException.keyed(ResultCode.NOT_FOUND, "payment.order.not_found"));
        if (!entity.getUserId().equals(userId)) {
            throw ValidationException.keyed(ResultCode.FORBIDDEN, "payment.order.forbidden");
        }
        JsonNode remote = client.getOrderInfo(idrOrderId);
        syncFromRemote(entity, remote);
        paymentOrderRepository.save(entity);
        if (isTerminalUnpaidStatus(entity.getStatus())) {
            throw ValidationException.keyed(ResultCode.BAD_REQUEST, "payment.order.expired");
        }
        ProductPlanEntity plan = resolvePlanForOrder(entity);
        return toCheckoutResp(entity, plan, remote, resumed);
    }

    private PayCheckoutResp createNewCheckout(long userId, String planCode) {
        ProductPlanEntity plan = planBiz.requireActivePlanByCode(planCode);
        if (plan.getPriceCents() == null || plan.getPriceCents() <= 0) {
            throw ValidationException.keyed(ResultCode.BAD_REQUEST, "payment.plan.no_online_payment");
        }
        String projectId = PlanPaymentSupport.resolveProjectId(plan, configService.effective());
        String skuId = PlanPaymentSupport.resolveSkuId(plan, envProperties);
        if (projectId.isBlank() || skuId.isBlank()) {
            throw new IllegalStateException("payment.plan.idr_not_configured");
        }

        String contactInfo = buildContactInfo(userId);
        Map<String, Object> orderInfo = new LinkedHashMap<>();
        orderInfo.put("quantity", 1);
        orderInfo.put("coupon", "");
        orderInfo.put("contactInfo", contactInfo);
        orderInfo.put("affCode", "");

        String idrOrderId = client.createOrder(projectId, skuId, orderInfo);
        JsonNode remote = client.getOrderInfo(idrOrderId);
        String status = PaymentOrderSyncService.normalizeStatus(client.orderStatus(remote));

        PaymentOrderEntity entity = new PaymentOrderEntity();
        entity.setUserId(userId);
        entity.setPlanId(plan.getId());
        entity.setPlanCode(plan.getCode());
        entity.setPlanName(plan.getName());
        entity.setIdrProjectId(projectId);
        entity.setIdrSkuId(skuId);
        entity.setIdrOrderId(idrOrderId);
        entity.setStatus(status);
        entity.setContactInfo(contactInfo);
        entity.setAmountCents(plan.getPriceCents());
        entity.setCurrency(plan.getCurrency());
        paymentOrderRepository.save(entity);

        if ("DONE".equals(status)) {
            paymentOrderSyncService.markPaid(entity, entity.getUserId(), "idatariver:" + entity.getIdrOrderId());
        }

        return toCheckoutResp(entity, plan, remote, false);
    }

    private ProductPlanEntity resolvePlanForOrder(PaymentOrderEntity entity) {
        if (entity.getPlanId() != null) {
            return planBiz.requirePlanByIdForOrder(entity.getPlanId());
        }
        return planBiz.requireActivePlanByCode(entity.getPlanCode());
    }

    private static boolean isTerminalUnpaidStatus(String status) {
        if (status == null) {
            return false;
        }
        String normalized = status.trim().toUpperCase();
        return "EXPIRED".equals(normalized) || "REFUND".equals(normalized);
    }

    @Transactional
    public Result<PayPendingResp> pendingOrder(long userId) {
        Optional<PaymentOrderEntity> pending = paymentOrderRepository
            .findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "NEW");
        if (pending.isEmpty()) {
            return ok(null);
        }
        PaymentOrderEntity entity = pending.get();
        if (client.isConfigured()) {
            try {
                JsonNode remote = client.getOrderInfo(entity.getIdrOrderId());
                syncFromRemote(entity, remote);
                paymentOrderRepository.save(entity);
            } catch (Exception ex) {
                log.debug("refresh pending order {} failed: {}", entity.getIdrOrderId(), ex.getMessage());
            }
        }
        if (!"NEW".equals(entity.getStatus())) {
            return ok(null);
        }
        return ok(new PayPendingResp(
            entity.getIdrOrderId(),
            entity.getPlanCode(),
            entity.getPlanName(),
            entity.getStatus(),
            entity.getAmountCents(),
            entity.getCurrency()
        ));
    }

    @Transactional
    public Result<PayStartResp> startPay(long userId, PayStartReq req) {
        requireConfigured();
        PaymentOrderEntity entity = paymentOrderRepository.findByIdrOrderId(req.orderId())
            .orElseThrow(() -> ValidationException.keyed(ResultCode.NOT_FOUND, "payment.order.not_found"));
        if (!entity.getUserId().equals(userId)) {
            throw ValidationException.keyed(ResultCode.FORBIDDEN, "payment.order.forbidden");
        }
        if ("DONE".equals(entity.getStatus())) {
            return ok(new PayStartResp(null, entity.getCurrency(), centsToAmount(entity.getAmountCents()), null));
        }
        if ("EXPIRED".equals(entity.getStatus()) || "REFUND".equals(entity.getStatus())) {
            throw ValidationException.keyed(ResultCode.BAD_REQUEST, "payment.order.expired");
        }

        String method = req.method();
        if (method == null || method.isBlank()) {
            method = configService.effective().getDefaultPayMethod();
        }
        String redirectUrl = configService.effective().publicUrl(
            "/checkout?order=" + entity.getIdrOrderId() + "&return=1"
        );
        String callbackUrl = configService.effective().webhookUrl();

        PayOrderResult pay = client.payOrder(
            entity.getIdrOrderId(),
            method,
            redirectUrl,
            callbackUrl
        );

        entity.setPayMethod(method);
        entity.setPayUrl(pay.payUrl);
        paymentOrderRepository.save(entity);

        String hint = isAlipayLike(method) ? messages.get("payment.alipay.vpn_hint") : null;
        if (pay.payUrl == null || pay.payUrl.isBlank()) {
            JsonNode remote = client.getOrderInfo(entity.getIdrOrderId());
            syncFromRemote(entity, remote);
            paymentOrderRepository.save(entity);
            return ok(new PayStartResp(null, pay.payCurrency, pay.amount, hint));
        }
        return ok(new PayStartResp(pay.payUrl, pay.payCurrency, pay.amount, hint));
    }

    @Transactional
    public Result<PayOrderStatusResp> orderStatus(long userId, String orderId) {
        PaymentOrderEntity entity = paymentOrderRepository.findByIdrOrderId(orderId)
            .orElseThrow(() -> ValidationException.keyed(ResultCode.NOT_FOUND, "payment.order.not_found"));
        if (!entity.getUserId().equals(userId)) {
            throw ValidationException.keyed(ResultCode.FORBIDDEN, "payment.order.view_forbidden");
        }
        if (client.isConfigured()) {
            try {
                JsonNode remote = client.getOrderInfo(orderId);
                syncFromRemote(entity, remote);
                paymentOrderRepository.save(entity);
            } catch (Exception ex) {
                log.debug("refresh order {} failed: {}", orderId, ex.getMessage());
            }
        }
        return ok(new PayOrderStatusResp(
            entity.getId(),
            entity.getIdrOrderId(),
            entity.getPlanCode(),
            entity.getStatus(),
            "DONE".equals(entity.getStatus()),
            entity.getPayUrl()
        ));
    }

    @Transactional
    public void handleWebhook(Map<String, Object> payload) {
        requireConfigured();
        String orderId = extractOrderId(payload);
        if (orderId == null || orderId.isBlank()) {
            throw ValidationException.keyed(ResultCode.BAD_REQUEST, "payment.webhook.missing_order_id");
        }
        JsonNode remote = client.getOrderInfo(orderId);
        PaymentOrderEntity entity = paymentOrderRepository.findByIdrOrderId(orderId)
            .orElseGet(() -> importStandaloneOrder(orderId, remote));
        entity.setCallbackJson(payload);
        syncFromRemote(entity, remote);
        paymentOrderRepository.save(entity);
    }

    /** 独立站 theme-basic 下单：本地无 PaymentOrder 时按 SKU + 联系邮箱导入并履约。 */
    private PaymentOrderEntity importStandaloneOrder(String orderId, JsonNode remote) {
        String contact = IdrOrderSnapshot.contactInfo(remote);
        long userId = paymentUserResolver.resolveUserId(contact);
        String skuId = IdrOrderSnapshot.skuId(remote);
        if (skuId == null || skuId.isBlank()) {
            throw ValidationException.keyed(ResultCode.BAD_REQUEST, "payment.webhook.sku_required");
        }
        ProductPlanEntity plan = planBiz.requireActivePlanByIdrSkuId(skuId);
        PaymentOrderEntity entity = new PaymentOrderEntity();
        entity.setUserId(userId);
        entity.setPlanId(plan.getId());
        entity.setPlanCode(plan.getCode());
        entity.setPlanName(plan.getName());
        entity.setIdrSkuId(skuId);
        String projectId = IdrOrderSnapshot.projectId(remote);
        if (projectId != null && !projectId.isBlank()) {
            entity.setIdrProjectId(projectId);
        } else if (plan.getIdrProjectId() != null) {
            entity.setIdrProjectId(plan.getIdrProjectId());
        }
        entity.setIdrOrderId(orderId);
        entity.setStatus(PaymentOrderSyncService.normalizeStatus(client.orderStatus(remote)));
        entity.setContactInfo(contact);
        entity.setAmountCents(plan.getPriceCents());
        entity.setCurrency(plan.getCurrency());
        return paymentOrderRepository.save(entity);
    }

    private void syncFromRemote(PaymentOrderEntity entity, JsonNode remote) {
        paymentOrderSyncService.syncFromRemote(entity, remote);
    }

    private PayCheckoutResp toCheckoutResp(
        PaymentOrderEntity entity,
        ProductPlanEntity plan,
        JsonNode remote,
        boolean resumed
    ) {
        List<PayCheckoutResp.PayMethodOption> payments = client.parsePaymentMethods(remote).stream()
            .map(m -> new PayCheckoutResp.PayMethodOption(m.method, m.name, m.desc, m.platform))
            .toList();
        boolean alipayAvailable = payments.stream().anyMatch(p -> isAlipayLike(p.method()));
        return new PayCheckoutResp(
            entity.getId(),
            entity.getIdrOrderId(),
            plan.getId(),
            plan.getCode(),
            plan.getName(),
            entity.getStatus(),
            entity.getAmountCents(),
            entity.getCurrency(),
            payments,
            alipayAvailable ? messages.get("payment.alipay.vpn_hint") : null,
            resumed
        );
    }

    private static String buildContactInfo(long userId) {
        return "na-u-" + userId;
    }

    private static String extractOrderId(Map<String, Object> payload) {
        Object id = payload.get("id");
        if (id == null) {
            id = payload.get("orderId");
        }
        return id == null ? null : String.valueOf(id);
    }

    private static boolean isAlipayLike(String method) {
        if (method == null) {
            return false;
        }
        String m = method.toLowerCase();
        return m.contains("alipay") || m.contains("wxpay") || m.contains("wechat");
    }

    private static Double centsToAmount(Integer cents) {
        return cents == null ? null : cents / 100.0;
    }

    private void requireConfigured() {
        if (!client.isConfigured()) {
            throw new IllegalStateException("payment.not_configured");
        }
    }
}
