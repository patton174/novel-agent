package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.dto.PlanPublicResp;
import cn.novelstudio.module.billing.entity.ProductPlanEntity;
import cn.novelstudio.module.billing.repository.PlanFeatureRepository;
import cn.novelstudio.module.billing.repository.ProductPlanRepository;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.kernel.enums.ResultCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class PlanBiz extends BaseBiz {

    private final ProductPlanRepository productPlanRepository;
    private final PlanFeatureRepository planFeatureRepository;

    public Result<List<PlanPublicResp>> listPublicPlans() {
        List<PlanPublicResp> plans = productPlanRepository.findByIsActiveTrueOrderBySortOrderAsc().stream()
            .map(this::toPublic)
            .toList();
        return ok(plans);
    }

    public ProductPlanEntity requireActivePlanByCode(String code) {
        return productPlanRepository.findByCodeAndIsActiveTrue(code)
            .orElseThrow(() -> new NotFoundException(ResultCode.BILLING_PLAN_NOT_FOUND, "套餐不存在: " + code));
    }

    public ProductPlanEntity requirePlanById(long planId) {
        return productPlanRepository.findById(planId)
            .filter(ProductPlanEntity::getIsActive)
            .orElseThrow(() -> new NotFoundException(ResultCode.BILLING_PLAN_NOT_FOUND, "套餐不存在"));
    }

    private PlanPublicResp toPublic(ProductPlanEntity plan) {
        List<String> features = planFeatureRepository.findByPlanIdAndEnabledTrue(plan.getId()).stream()
            .map(f -> featureLabel(f.getFeatureKey()))
            .toList();
        String priceLabel = plan.getPriceCents() == null
            ? "定制"
            : (plan.getPriceCents() == 0 ? "免费" : "¥" + (plan.getPriceCents() / 100));
        String periodLabel = plan.getPriceCents() != null && plan.getPriceCents() > 0 ? "/月" : null;
        String cta = switch (plan.getCode()) {
            case "free", "hobby" -> "免费开始";
            case "lite" -> "立即升级";
            case "pro" -> "联系升级";
            default -> "联系销售";
        };
        return new PlanPublicResp(
            plan.getCode(),
            plan.getName(),
            plan.getDescription(),
            plan.getPriceCents(),
            plan.getCurrency(),
            priceLabel,
            periodLabel,
            plan.getMonthlyTokenQuota(),
            plan.getMonthlyRunQuota(),
            features,
            Boolean.TRUE.equals(plan.getIsFeatured()),
            cta
        );
    }

    private static String featureLabel(String key) {
        return switch (key) {
            case "basic_editor" -> "智能编辑器";
            case "txt_export" -> "导出 TXT";
            case "pdf_export" -> "导出 PDF / EPUB";
            case "custom_model" -> "自定义 AI 模型";
            case "priority_support" -> "优先技术支持";
            case "team_collaboration" -> "团队协作";
            case "custom_integrations" -> "定制集成";
            default -> key;
        };
    }
}
