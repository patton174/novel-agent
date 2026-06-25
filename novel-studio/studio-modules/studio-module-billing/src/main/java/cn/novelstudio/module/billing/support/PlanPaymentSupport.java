package cn.novelstudio.module.billing.support;

import cn.novelstudio.module.billing.config.IDataRiverProperties;
import cn.novelstudio.module.billing.service.IDataRiverConfigService.EffectiveConfig;
import cn.novelstudio.module.billing.dto.PlanOrderStatsResp;
import cn.novelstudio.module.billing.entity.ProductPlanEntity;
import cn.novelstudio.module.billing.repository.PaymentOrderRepository;

import java.util.List;

public final class PlanPaymentSupport {

    private PlanPaymentSupport() {
    }

    public static boolean isPaymentReady(
        ProductPlanEntity plan,
        EffectiveConfig config,
        IDataRiverProperties envProperties
    ) {
        if (plan.getPriceCents() == null || plan.getPriceCents() <= 0) {
            return false;
        }
        if (config == null || !config.isConfigured()) {
            return false;
        }
        String sku = resolveSkuId(plan, envProperties);
        String project = resolveProjectId(plan, config);
        return !sku.isBlank() && !project.isBlank();
    }

    public static String resolveProjectId(ProductPlanEntity plan, EffectiveConfig config) {
        if (plan.getIdrProjectId() != null && !plan.getIdrProjectId().isBlank()) {
            return plan.getIdrProjectId().trim();
        }
        if (config == null || config.getProjectId() == null) {
            return "";
        }
        return config.getProjectId().trim();
    }

    public static String resolveSkuId(ProductPlanEntity plan, IDataRiverProperties envProperties) {
        if (plan.getIdrSkuId() != null && !plan.getIdrSkuId().isBlank()) {
            return plan.getIdrSkuId().trim();
        }
        if (envProperties == null || envProperties.getPlanSkuIds() == null) {
            return "";
        }
        String fromMap = envProperties.getPlanSkuIds().get(plan.getCode());
        return fromMap == null ? "" : fromMap.trim();
    }

    public static PlanOrderStatsResp statsForPlan(
        PaymentOrderRepository repository,
        ProductPlanEntity plan
    ) {
        List<Object[]> rows = repository.countGroupedByStatusForPlan(plan.getId(), plan.getCode());
        int pending = 0;
        int paid = 0;
        int expired = 0;
        int refunded = 0;
        for (Object[] row : rows) {
            String status = row[0] == null ? "" : String.valueOf(row[0]).trim().toUpperCase();
            int count = row[1] == null ? 0 : ((Number) row[1]).intValue();
            switch (status) {
                case "DONE" -> paid += count;
                case "EXPIRED" -> expired += count;
                case "REFUND" -> refunded += count;
                case "NEW" -> pending += count;
                default -> pending += count;
            }
        }
        return new PlanOrderStatsResp(pending + paid + expired + refunded, pending, paid, expired, refunded);
    }
}
