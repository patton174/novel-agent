package com.novel.agent.billing.controller.internal;

import com.novel.agent.billing.dto.InternalAuditLogReq;
import com.novel.agent.billing.dto.PublicSiteSettingsResp;
import com.novel.agent.billing.dto.QuotaCheckResp;
import com.novel.agent.billing.dto.UsageReportRequest;
import com.novel.agent.billing.service.AuditLogService;
import com.novel.agent.billing.service.biz.QuotaBiz;
import com.novel.agent.billing.service.biz.SiteSettingsBiz;
import com.novel.agent.billing.service.biz.SubscriptionBiz;
import com.novel.agent.billing.service.biz.UsageReportBiz;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.service.BaseController;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/billing")
@RequiredArgsConstructor
public class InternalBillingController extends BaseController {

    private final UsageReportBiz usageReportBiz;
    private final QuotaBiz quotaBiz;
    private final SubscriptionBiz subscriptionBiz;
    private final AuditLogService auditLogService;
    private final SiteSettingsBiz siteSettingsBiz;
    private final FeatureGateBiz featureGateBiz;

    @PostMapping("/usage/report")
    public Result<Void> reportUsage(@Valid @RequestBody UsageReportRequest request) {
        usageReportBiz.persistReport(request);
        return ok();
    }

    @GetMapping("/quota/check")
    public Result<QuotaCheckResp> quotaCheck(@RequestParam long userId) {
        return ok(quotaBiz.peek(userId));
    }

    @PostMapping("/quota/assert-run")
    public Result<QuotaCheckResp> assertRun(@RequestParam long userId) {
        return ok(quotaBiz.checkAndReserveRun(userId));
    }

    @PostMapping("/subscription/default")
    public Result<Void> createDefaultSubscription(@RequestParam long userId) {
        subscriptionBiz.ensureDefaultSubscription(userId);
        return ok();
    }

    @PostMapping("/audit/log")
    public Result<Void> auditLog(@Valid @RequestBody InternalAuditLogReq req) {
        auditLogService.log(
            req.actorId(),
            req.action(),
            req.targetType(),
            req.targetId(),
            req.before(),
            req.after()
        );
        return ok();
    }

    @GetMapping("/settings/public")
    public Result<PublicSiteSettingsResp> publicSettings() {
        return ok(siteSettingsBiz.publicSettings());
    }

    @PostMapping("/features/assert")
    public Result<Void> assertFeature(
        @RequestParam long userId,
        @RequestParam String featureKey
    ) {
        featureGateBiz.assertFeature(userId, featureKey);
        return ok();
    }
}
