package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.config.IDataRiverProperties;
import cn.novelstudio.module.billing.dto.PlanPublicResp;
import cn.novelstudio.module.billing.entity.ProductPlanEntity;
import cn.novelstudio.module.billing.repository.PlanFeatureRepository;
import cn.novelstudio.module.billing.repository.ProductPlanRepository;
import cn.novelstudio.module.billing.service.IDataRiverConfigService;
import cn.novelstudio.module.billing.support.PlanPaymentSupport;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.platform.i18n.StudioMessages;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class PlanBiz extends BaseBiz {

    private final ProductPlanRepository productPlanRepository;
    private final PlanFeatureRepository planFeatureRepository;
    private final StudioMessages messages;
    private final IDataRiverConfigService configService;
    private final IDataRiverProperties envProperties;

    public Result<List<PlanPublicResp>> listPublicPlans() {
        List<PlanPublicResp> plans = productPlanRepository.findByIsActiveTrueOrderBySortOrderAsc().stream()
            .map(this::toPublic)
            .toList();
        return ok(plans);
    }

    public ProductPlanEntity requireActivePlanByCode(String code) {
        return productPlanRepository.findByCodeAndIsActiveTrue(code)
            .orElseThrow(() -> NotFoundException.keyed(
                ResultCode.BILLING_PLAN_NOT_FOUND,
                "result.billing.plan_not_found_code",
                code
            ));
    }

    public ProductPlanEntity requirePlanById(long planId) {
        return productPlanRepository.findById(planId)
            .filter(ProductPlanEntity::getIsActive)
            .orElseThrow(() -> NotFoundException.keyed(ResultCode.BILLING_PLAN_NOT_FOUND, "result.billing.plan_not_found"));
    }

    /** 订单履约等场景：允许已下架套餐（按下单快照 plan_id 升级）。 */
    public ProductPlanEntity requirePlanByIdForOrder(long planId) {
        return productPlanRepository.findById(planId)
            .orElseThrow(() -> NotFoundException.keyed(ResultCode.BILLING_PLAN_NOT_FOUND, "result.billing.plan_not_found"));
    }

    public ProductPlanEntity requireActivePlanByIdrSkuId(String idrSkuId) {
        return productPlanRepository.findFirstByIdrSkuIdAndIsActiveTrue(idrSkuId)
            .orElseThrow(() -> NotFoundException.keyed(
                ResultCode.BILLING_PLAN_NOT_FOUND,
                "payment.webhook.plan_not_found_for_sku",
                idrSkuId
            ));
    }

    private PlanPublicResp toPublic(ProductPlanEntity plan) {
        List<String> features = planFeatureRepository.findByPlanIdAndEnabledTrue(plan.getId()).stream()
            .map(f -> featureLabel(f.getFeatureKey()))
            .toList();
        String priceLabel = plan.getPriceCents() == null
            ? messages.get("plan.price.custom")
            : (plan.getPriceCents() == 0
                ? messages.get("plan.price.free")
                : messages.get("plan.price.amount", plan.getPriceCents() / 100));
        String periodLabel = plan.getPriceCents() != null && plan.getPriceCents() > 0
            ? messages.get("plan.price.per_month")
            : null;
        String cta = switch (plan.getCode()) {
            case "free", "hobby" -> messages.get("plan.cta.start_free");
            case "lite" -> messages.get("plan.cta.upgrade");
            case "pro" -> messages.get("plan.cta.contact_upgrade");
            default -> messages.get("plan.cta.contact_sales");
        };
        return new PlanPublicResp(
            plan.getCode(),
            localizedPlanName(plan),
            localizedPlanDescription(plan),
            plan.getPriceCents(),
            plan.getCurrency(),
            priceLabel,
            periodLabel,
            plan.getMonthlyTokenQuota(),
            plan.getMonthlyRunQuota(),
            features,
            Boolean.TRUE.equals(plan.getIsFeatured()),
            cta,
            paymentSkuId(plan)
        );
    }

    public String localizedPlanName(ProductPlanEntity plan) {
        return planLabel(plan.getCode(), "name", plan.getName());
    }

    public String localizedPlanName(String planCode, String dbFallback) {
        return planLabel(planCode, "name", dbFallback);
    }

    public String localizedPlanDescription(ProductPlanEntity plan) {
        return planLabel(plan.getCode(), "desc", plan.getDescription());
    }

    private String paymentSkuId(ProductPlanEntity plan) {
        if (!PlanPaymentSupport.isPaymentReady(plan, configService.effective(), envProperties)) {
            return null;
        }
        String sku = PlanPaymentSupport.resolveSkuId(plan, envProperties);
        return sku.isBlank() ? null : sku;
    }

    private String planLabel(String code, String field, String fallback) {
        String key = "plan." + code + "." + field;
        return messages.getOrDefault(key, fallback == null ? "" : fallback);
    }

    private String featureLabel(String key) {
        return messages.getOrDefault("plan.feature." + key, key);
    }
}
