package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.config.IDataRiverProperties;
import cn.novelstudio.module.billing.service.IDataRiverConfigService;
import cn.novelstudio.module.billing.dto.PlanIdrBindingReq;
import cn.novelstudio.module.billing.dto.PlanCrmDetailResp;
import cn.novelstudio.module.billing.dto.PlanCrmResp;
import cn.novelstudio.module.billing.dto.PlanCrmUpsertReq;
import cn.novelstudio.module.billing.dto.PaymentOrderCrmResp;
import cn.novelstudio.module.billing.entity.PlanFeatureEntity;
import cn.novelstudio.module.billing.entity.ProductPlanEntity;
import cn.novelstudio.module.billing.repository.PaymentOrderRepository;
import cn.novelstudio.module.billing.repository.PlanFeatureRepository;
import cn.novelstudio.module.billing.repository.ProductPlanRepository;
import cn.novelstudio.module.billing.service.AuditLogService;
import cn.novelstudio.module.billing.support.PlanPaymentSupport;
import cn.novelstudio.kernel.base.Page;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class PlanCrmBiz extends BaseBiz {

    private final ProductPlanRepository productPlanRepository;
    private final PlanFeatureRepository planFeatureRepository;
    private final PaymentOrderRepository paymentOrderRepository;
    private final PaymentOrderCrmBiz paymentOrderCrmBiz;
    private final IDataRiverConfigService idataRiverConfigService;
    private final IDataRiverProperties envProperties;
    private final AuditLogService auditLogService;

    public Result<List<PlanCrmResp>> listAll() {
        List<PlanCrmResp> plans = productPlanRepository.findAllByOrderBySortOrderAsc().stream()
            .map(this::toCrm)
            .toList();
        return ok(plans);
    }

    public Result<PlanCrmDetailResp> detail(long planId, int recentLimit) {
        ProductPlanEntity plan = requirePlan(planId);
        PlanCrmResp crm = toCrm(plan);
        int limit = Math.min(Math.max(recentLimit, 1), 20);
        var pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        var recent = paymentOrderRepository.findLinkedToPlan(plan.getId(), plan.getCode(), pageable)
            .getContent().stream()
            .map(paymentOrderCrmBiz::toCrmResp)
            .toList();
        return ok(new PlanCrmDetailResp(
            crm,
            crm.paymentReady(),
            crm.orderStats(),
            recent
        ));
    }

    public Result<Page<PaymentOrderCrmResp>> listOrders(
        long planId,
        int pageCurrent,
        int pageSize
    ) {
        ProductPlanEntity plan = requirePlan(planId);
        var pageable = PageRequest.of(
            Math.max(pageCurrent - 1, 0),
            Math.max(pageSize, 1),
            Sort.by(Sort.Direction.DESC, "createdAt")
        );
        var page = paymentOrderRepository.findLinkedToPlan(plan.getId(), plan.getCode(), pageable);
        var list = page.getContent().stream().map(paymentOrderCrmBiz::toCrmResp).toList();
        return ok(Page.of(list, page.getTotalElements(), pageCurrent, pageSize));
    }

    @Transactional
    public Result<PlanCrmResp> create(PlanCrmUpsertReq req, Long actorId) {
        if (productPlanRepository.findByCode(req.code()).isPresent()) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "billing.plan.code_exists", req.code());
        }
        ProductPlanEntity plan = applyFields(new ProductPlanEntity(), req);
        plan.setIsActive(true);
        ProductPlanEntity saved = productPlanRepository.save(plan);
        replaceFeatures(saved.getId(), req.features());
        auditLogService.log(actorId, "plan.create", "product_plan", String.valueOf(saved.getId()), null, toCrm(saved));
        return ok(toCrm(saved));
    }

    @Transactional
    public Result<PlanCrmResp> update(long planId, PlanCrmUpsertReq req, Long actorId) {
        ProductPlanEntity plan = requirePlan(planId);
        PlanCrmResp before = toCrm(plan);
        if (!plan.getCode().equals(req.code())
            && productPlanRepository.findByCode(req.code()).filter(p -> !p.getId().equals(planId)).isPresent()) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "billing.plan.code_exists", req.code());
        }
        applyFields(plan, req);
        ProductPlanEntity saved = productPlanRepository.save(plan);
        replaceFeatures(saved.getId(), req.features());
        PlanCrmResp after = toCrm(saved);
        auditLogService.log(actorId, "plan.update", "product_plan", String.valueOf(planId), before, after);
        return ok(after);
    }

    @Transactional
    public Result<Void> deactivate(long planId, Long actorId) {
        ProductPlanEntity plan = requirePlan(planId);
        long pending = paymentOrderRepository.countLinkedByStatus(plan.getId(), plan.getCode(), "NEW");
        if (pending > 0) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "billing.plan.pending_orders", pending);
        }
        PlanCrmResp before = toCrm(plan);
        plan.setIsActive(false);
        plan.setIsFeatured(false);
        productPlanRepository.save(plan);
        auditLogService.log(actorId, "plan.delete", "product_plan", String.valueOf(planId), before, toCrm(plan));
        return ok();
    }

    @Transactional
    public Result<PlanCrmResp> activate(long planId, Long actorId) {
        ProductPlanEntity plan = requirePlan(planId);
        PlanCrmResp before = toCrm(plan);
        plan.setIsActive(true);
        ProductPlanEntity saved = productPlanRepository.save(plan);
        PlanCrmResp after = toCrm(saved);
        auditLogService.log(actorId, "plan.activate", "product_plan", String.valueOf(planId), before, after);
        return ok(after);
    }

    @Transactional
    public Result<PlanCrmResp> updateIdrBinding(long planId, PlanIdrBindingReq req, Long actorId) {
        ProductPlanEntity plan = requirePlan(planId);
        PlanCrmResp before = toCrm(plan);
        plan.setIdrProjectId(trimOrNull(req.idrProjectId()));
        plan.setIdrSkuId(trimOrNull(req.idrSkuId()));
        ProductPlanEntity saved = productPlanRepository.save(plan);
        PlanCrmResp after = toCrm(saved);
        auditLogService.log(actorId, "plan.idr_binding", "product_plan", String.valueOf(planId), before, after);
        return ok(after);
    }

    private ProductPlanEntity applyFields(ProductPlanEntity plan, PlanCrmUpsertReq req) {
        plan.setCode(req.code().trim());
        plan.setName(req.name().trim());
        plan.setDescription(req.description());
        plan.setPriceCents(req.priceCents());
        plan.setCurrency(req.currency() == null || req.currency().isBlank() ? "CNY" : req.currency().trim());
        plan.setMonthlyTokenQuota(req.monthlyTokenQuota());
        plan.setMonthlyRunQuota(req.monthlyRunQuota());
        if (req.rateLimitRpm() != null) {
            plan.setRateLimitRpm(req.rateLimitRpm());
        }
        if (req.overagePolicy() != null && !req.overagePolicy().isBlank()) {
            plan.setOveragePolicy(req.overagePolicy());
        }
        if (req.isFeatured() != null) {
            plan.setIsFeatured(req.isFeatured());
        }
        if (req.sortOrder() != null) {
            plan.setSortOrder(req.sortOrder());
        }
        plan.setIdrProjectId(trimOrNull(req.idrProjectId()));
        plan.setIdrSkuId(trimOrNull(req.idrSkuId()));
        return plan;
    }

    private static String trimOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private void replaceFeatures(long planId, List<String> features) {
        planFeatureRepository.deleteByPlanId(planId);
        // 强制 DELETE 立即落库，避免同事务内 Hibernate flush 顺序（INSERT 先于 DELETE）
        // 导致同 (plan_id, feature_key) 撞唯一约束 plan_feature_plan_id_feature_key_key。
        planFeatureRepository.flush();
        if (features == null || features.isEmpty()) {
            return;
        }
        Set<String> seen = new LinkedHashSet<>();
        for (String feature : features) {
            if (feature == null || feature.isBlank() || !seen.add(feature.trim())) {
                continue;
            }
            PlanFeatureEntity entity = new PlanFeatureEntity();
            entity.setPlanId(planId);
            entity.setFeatureKey(feature.trim());
            entity.setEnabled(true);
            planFeatureRepository.save(entity);
        }
    }

    private PlanCrmResp toCrm(ProductPlanEntity plan) {
        List<String> features = planFeatureRepository.findByPlanId(plan.getId()).stream()
            .filter(f -> Boolean.TRUE.equals(f.getEnabled()))
            .map(PlanFeatureEntity::getFeatureKey)
            .toList();
        return new PlanCrmResp(
            plan.getId(),
            plan.getCode(),
            plan.getName(),
            plan.getDescription(),
            plan.getPriceCents(),
            plan.getCurrency(),
            plan.getMonthlyTokenQuota(),
            plan.getMonthlyRunQuota(),
            plan.getRateLimitRpm(),
            plan.getOveragePolicy(),
            Boolean.TRUE.equals(plan.getIsActive()),
            Boolean.TRUE.equals(plan.getIsFeatured()),
            plan.getSortOrder() == null ? 0 : plan.getSortOrder(),
            features,
            plan.getIdrProjectId(),
            plan.getIdrSkuId(),
            PlanPaymentSupport.isPaymentReady(plan, idataRiverConfigService.effective(), envProperties),
            PlanPaymentSupport.statsForPlan(paymentOrderRepository, plan)
        );
    }

    private ProductPlanEntity requirePlan(long planId) {
        return productPlanRepository.findById(planId)
            .orElseThrow(() -> NotFoundException.keyed(ResultCode.BILLING_PLAN_NOT_FOUND, ResultCode.BILLING_PLAN_NOT_FOUND.getMessageKey()));
    }
}
