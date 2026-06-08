package com.novel.agent.billing.service.biz;

import com.novel.agent.billing.dto.PlanPublicResp;
import com.novel.agent.billing.entity.ProductPlanEntity;
import com.novel.agent.billing.repository.PlanFeatureRepository;
import com.novel.agent.billing.repository.ProductPlanRepository;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.common.core.exception.NotFoundException;
import com.novel.agent.common.core.enums.ResultCode;
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
            ? "Custom"
            : (plan.getPriceCents() == 0 ? "Free" : "¥" + (plan.getPriceCents() / 100));
        String periodLabel = plan.getPriceCents() != null && plan.getPriceCents() > 0 ? "/mo" : null;
        String cta = switch (plan.getCode()) {
            case "hobby" -> "免费开始";
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
            case "basic_editor" -> "Basic Editor";
            case "txt_export" -> "Export to TXT";
            case "pdf_export" -> "Export to PDF/EPUB";
            case "custom_model" -> "Custom AI Models";
            case "priority_support" -> "Priority Support";
            case "team_collaboration" -> "Team Collaboration";
            case "custom_integrations" -> "Custom Integrations";
            default -> key;
        };
    }
}
