package cn.novelstudio.module.billing.controller.crm;

import cn.novelstudio.module.billing.dto.*;
import cn.novelstudio.module.billing.service.biz.AuditLogBiz;
import cn.novelstudio.module.billing.service.biz.PlanCrmBiz;
import cn.novelstudio.module.billing.service.biz.SiteContentBiz;
import cn.novelstudio.module.billing.service.biz.SiteSettingsBiz;
import cn.novelstudio.module.billing.service.biz.SubscriptionBiz;
import cn.novelstudio.module.billing.service.biz.UsageCrmBiz;
import cn.novelstudio.kernel.base.Page;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/billing/crm")
@RequiredArgsConstructor
public class BillingCrmController extends BaseController {

    private final PlanCrmBiz planCrmBiz;
    private final SubscriptionBiz subscriptionBiz;
    private final UsageCrmBiz usageCrmBiz;
    private final SiteContentBiz siteContentBiz;
    private final SiteSettingsBiz siteSettingsBiz;
    private final AuditLogBiz auditLogBiz;

    @GetMapping("/plans")
    public Result<List<PlanCrmResp>> listPlans() {
        return planCrmBiz.listAll();
    }

    @PostMapping("/plans")
    public Result<PlanCrmResp> createPlan(
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader,
        @Valid @RequestBody PlanCrmUpsertReq req
    ) {
        return planCrmBiz.create(req, parseOptionalUserId(actorHeader));
    }

    @PutMapping("/plans/{id}")
    public Result<PlanCrmResp> updatePlan(
        @PathVariable long id,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader,
        @Valid @RequestBody PlanCrmUpsertReq req
    ) {
        return planCrmBiz.update(id, req, parseOptionalUserId(actorHeader));
    }

    @DeleteMapping("/plans/{id}")
    public Result<Void> deactivatePlan(
        @PathVariable long id,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader
    ) {
        return planCrmBiz.deactivate(id, parseOptionalUserId(actorHeader));
    }

    @PutMapping("/user/{userId}/subscription")
    public Result<Void> updateUserSubscription(
        @PathVariable long userId,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader,
        @Valid @RequestBody UserSubscriptionUpdateReq req
    ) {
        subscriptionBiz.changeUserPlan(userId, req.planCode(), parseOptionalUserId(actorHeader), req.reason());
        return ok();
    }

    @GetMapping("/usage/user/{userId}")
    public Result<UserUsageCrmResp> userUsage(@PathVariable long userId) {
        return usageCrmBiz.getUserUsage(userId);
    }

    @PostMapping("/user/{userId}/quota-override")
    public Result<Void> addQuotaOverride(
        @PathVariable long userId,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader,
        @Valid @RequestBody QuotaOverrideReq req
    ) {
        return usageCrmBiz.addQuotaOverride(userId, req, parseOptionalUserId(actorHeader));
    }

    @GetMapping("/usage/overview")
    public Result<PlatformUsageOverviewResp> usageOverview() {
        return usageCrmBiz.platformOverview();
    }

    @GetMapping("/usage/trends")
    public Result<PlatformUsageTrendsResp> usageTrends(@RequestParam(defaultValue = "30") int days) {
        return usageCrmBiz.platformTrends(days);
    }

    @GetMapping("/site-content")
    public Result<List<SiteContentResp>> listSiteContent() {
        return siteContentBiz.listAll();
    }

    @PutMapping("/site-content/{key}")
    public Result<SiteContentResp> updateSiteContent(
        @PathVariable String key,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader,
        @Valid @RequestBody SiteContentUpdateReq req
    ) {
        return siteContentBiz.update(key, req, parseOptionalUserId(actorHeader));
    }

    @GetMapping("/audit-log")
    public Result<Page<AuditLogResp>> auditLog(
        @RequestParam(required = false) String action,
        @RequestParam(required = false) Long actorId,
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return auditLogBiz.page(action, actorId, pageCurrent, pageSize);
    }

    @GetMapping("/settings")
    public Result<SiteSettingsResp> getSettings() {
        return siteSettingsBiz.getSettings();
    }

    @PutMapping("/settings")
    public Result<SiteSettingsResp> updateSettings(
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader,
        @Valid @RequestBody SiteSettingsUpdateReq req
    ) {
        return siteSettingsBiz.updateSettings(req, parseOptionalUserId(actorHeader));
    }

    private static Long parseOptionalUserId(String header) {
        if (header == null || header.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(header.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
