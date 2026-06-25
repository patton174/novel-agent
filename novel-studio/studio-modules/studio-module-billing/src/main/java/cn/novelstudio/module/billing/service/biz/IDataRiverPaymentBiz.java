package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.billing.config.IDataRiverProperties;
import cn.novelstudio.module.billing.service.IDataRiverConfigService;
import cn.novelstudio.module.billing.dto.PayCheckoutReq;
import cn.novelstudio.module.billing.dto.PayCheckoutResp;
import cn.novelstudio.module.billing.dto.PayOrderStatusResp;
import cn.novelstudio.module.billing.dto.PayStartReq;
import cn.novelstudio.module.billing.dto.PayStartResp;
import cn.novelstudio.module.billing.entity.PaymentOrderEntity;
import cn.novelstudio.module.billing.entity.ProductPlanEntity;
import cn.novelstudio.module.billing.integration.idatariver.IDataRiverClient;
import cn.novelstudio.module.billing.repository.PaymentOrderRepository;
import cn.novelstudio.module.billing.service.PaymentOrderSyncService;
import cn.novelstudio.module.billing.support.PlanPaymentSupport;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class IDataRiverPaymentBiz extends BaseBiz {

    private static final Logger log = LoggerFactory.getLogger(IDataRiverPaymentBiz.class);
    private static final String ALIPAY_HINT = "如果无法打开支付页面，请关闭 VPN 或切换网络。";

    private final IDataRiverConfigService configService;
    private final IDataRiverProperties envProperties;
    private final IDataRiverClient client;
    private final PaymentOrderRepository paymentOrderRepository;
    private final PlanBiz planBiz;
    private final PaymentOrderSyncService paymentOrderSyncService;

    @Transactional
    public Result<PayCheckoutResp> checkout(long userId, PayCheckoutReq req) {
        requireConfigured();
        ProductPlanEntity plan = planBiz.requireActivePlanByCode(req.planCode());
        if (plan.getPriceCents() == null || plan.getPriceCents() <= 0) {
            throw new IllegalArgumentException("该套餐无需在线支付，请联系客服");
        }
        String projectId = PlanPaymentSupport.resolveProjectId(plan, configService.effective());
        String skuId = PlanPaymentSupport.resolveSkuId(plan, envProperties);
        if (projectId.isBlank() || skuId.isBlank()) {
            throw new IllegalStateException("套餐未配置 iDataRiver 商品，请联系管理员");
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

        return ok(toCheckoutResp(entity, plan, remote));
    }

    @Transactional
    public Result<PayStartResp> startPay(long userId, PayStartReq req) {
        requireConfigured();
        PaymentOrderEntity entity = paymentOrderRepository.findByIdrOrderId(req.orderId())
            .orElseThrow(() -> new IllegalArgumentException("订单不存在"));
        if (!entity.getUserId().equals(userId)) {
            throw new IllegalArgumentException("无权操作该订单");
        }
        if ("DONE".equals(entity.getStatus())) {
            return ok(new PayStartResp(null, entity.getCurrency(), centsToAmount(entity.getAmountCents()), null));
        }
        if ("EXPIRED".equals(entity.getStatus()) || "REFUND".equals(entity.getStatus())) {
            throw new IllegalArgumentException("订单已失效");
        }

        String method = req.method();
        if (method == null || method.isBlank()) {
            method = configService.effective().getDefaultPayMethod();
        }
        String redirectUrl = configService.effective().publicUrl("/dashboard/billing?payOrder=" + entity.getIdrOrderId());
        String callbackUrl = configService.effective().webhookUrl();

        IDataRiverClient.PayOrderResult pay = client.payOrder(
            entity.getIdrOrderId(),
            method,
            redirectUrl,
            callbackUrl
        );

        entity.setPayMethod(method);
        entity.setPayUrl(pay.payUrl);
        paymentOrderRepository.save(entity);

        String hint = isAlipayLike(method) ? ALIPAY_HINT : null;
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
            .orElseThrow(() -> new IllegalArgumentException("订单不存在"));
        if (!entity.getUserId().equals(userId)) {
            throw new IllegalArgumentException("无权查看该订单");
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
            throw new IllegalArgumentException("回调缺少订单 id");
        }
        JsonNode remote = client.getOrderInfo(orderId);
        PaymentOrderEntity entity = paymentOrderRepository.findByIdrOrderId(orderId)
            .orElseThrow(() -> new IllegalArgumentException("未知订单: " + orderId));
        entity.setCallbackJson(payload);
        syncFromRemote(entity, remote);
        paymentOrderRepository.save(entity);
    }

    private void syncFromRemote(PaymentOrderEntity entity, JsonNode remote) {
        paymentOrderSyncService.syncFromRemote(entity, remote);
    }

    private PayCheckoutResp toCheckoutResp(
        PaymentOrderEntity entity,
        ProductPlanEntity plan,
        JsonNode remote
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
            alipayAvailable ? ALIPAY_HINT : null
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
            throw new IllegalStateException("在线支付未启用，请配置 IDATARIVER_MERCHANT_SECRET");
        }
    }
}
