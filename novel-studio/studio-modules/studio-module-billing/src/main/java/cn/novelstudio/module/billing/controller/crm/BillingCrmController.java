package cn.novelstudio.module.billing.controller.crm;

import cn.novelstudio.module.billing.dto.*;
import cn.novelstudio.module.billing.entity.RedemptionCodeEntity;
import cn.novelstudio.module.billing.entity.UpgradeRequestEntity;
import cn.novelstudio.module.billing.entity.UsagePeriodSummaryEntity;
import cn.novelstudio.module.billing.repository.RedemptionCodeRepository;
import cn.novelstudio.module.billing.repository.UsagePeriodSummaryRepository;
import cn.novelstudio.module.billing.service.biz.AuditLogBiz;
import cn.novelstudio.module.billing.service.biz.PaymentOrderCrmBiz;
import cn.novelstudio.module.billing.service.biz.PlanCrmBiz;
import cn.novelstudio.module.billing.service.biz.SiteContentBiz;
import cn.novelstudio.module.billing.service.PaymentSettingsBiz;
import cn.novelstudio.module.billing.service.biz.SiteSettingsBiz;
import cn.novelstudio.module.billing.service.biz.SubscriptionBiz;
import cn.novelstudio.module.billing.service.biz.UpgradeRequestBiz;
import cn.novelstudio.module.billing.service.biz.UsageCrmBiz;
import cn.novelstudio.module.billing.service.biz.UserBalanceBiz;
import cn.novelstudio.module.billing.support.RedemptionCodeGenerator;
import cn.novelstudio.kernel.base.Page;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.tools.IdWorker;
import cn.novelstudio.platform.web.AuthRoleSupport;
import cn.novelstudio.platform.web.BaseController;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/billing/crm")
@RequiredArgsConstructor
public class BillingCrmController extends BaseController {

    private final PlanCrmBiz planCrmBiz;
    private final PaymentOrderCrmBiz paymentOrderCrmBiz;
    private final SubscriptionBiz subscriptionBiz;
    private final UsageCrmBiz usageCrmBiz;
    private final SiteContentBiz siteContentBiz;
    private final SiteSettingsBiz siteSettingsBiz;
    private final PaymentSettingsBiz paymentSettingsBiz;
    private final AuditLogBiz auditLogBiz;
    private final RedemptionCodeRepository redemptionCodeRepository;
    private final RedemptionCodeGenerator redemptionCodeGenerator;
    private final UpgradeRequestBiz upgradeRequestBiz;
    private final UserBalanceBiz userBalanceBiz;
    private final UsagePeriodSummaryRepository usagePeriodSummaryRepository;

    @GetMapping("/plans")
    public Result<List<PlanCrmResp>> listPlans() {
        return planCrmBiz.listAll();
    }

    @GetMapping("/plans/{id}")
    public Result<PlanCrmDetailResp> planDetail(
        @PathVariable long id,
        @RequestParam(defaultValue = "5") int recentLimit
    ) {
        return planCrmBiz.detail(id, recentLimit);
    }

    @GetMapping("/plans/{id}/orders")
    public Result<Page<PaymentOrderCrmResp>> planOrders(
        @PathVariable long id,
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return planCrmBiz.listOrders(id, pageCurrent, pageSize);
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

    @PostMapping("/plans/{id}/activate")
    public Result<PlanCrmResp> activatePlan(
        @PathVariable long id,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader
    ) {
        return planCrmBiz.activate(id, parseOptionalUserId(actorHeader));
    }

    @PutMapping("/plans/{id}/idr-binding")
    public Result<PlanCrmResp> updatePlanIdrBinding(
        @PathVariable long id,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader,
        @RequestBody PlanIdrBindingReq req
    ) {
        return planCrmBiz.updateIdrBinding(id, req, parseOptionalUserId(actorHeader));
    }

    @GetMapping("/payment-orders")
    public Result<Page<PaymentOrderCrmResp>> listPaymentOrders(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) Long userId,
        @RequestParam(required = false) Long planId,
        @RequestParam(required = false) String planCode,
        @RequestParam(required = false) String orderQuery,
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return paymentOrderCrmBiz.page(status, userId, planId, planCode, orderQuery, pageCurrent, pageSize);
    }

    @GetMapping("/payment-orders/{id}")
    public Result<PaymentOrderCrmDetailResp> paymentOrderDetail(
        @PathVariable long id,
        @RequestParam(defaultValue = "false") boolean syncRemote
    ) {
        return paymentOrderCrmBiz.detail(id, syncRemote);
    }

    @PostMapping("/payment-orders/{id}/sync")
    public Result<PaymentOrderCrmDetailResp> syncPaymentOrder(
        @PathVariable long id,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader
    ) {
        return paymentOrderCrmBiz.syncRemote(id, parseOptionalUserId(actorHeader));
    }

    @PostMapping("/payment-orders/{id}/fulfill")
    public Result<PaymentOrderCrmDetailResp> fulfillPaymentOrder(
        @PathVariable long id,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader,
        @RequestBody(required = false) PaymentOrderActionReq req
    ) {
        return paymentOrderCrmBiz.fulfill(id, parseOptionalUserId(actorHeader), req);
    }

    @PostMapping("/payment-orders/{id}/expire")
    public Result<PaymentOrderCrmDetailResp> expirePaymentOrder(
        @PathVariable long id,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader,
        @RequestBody(required = false) PaymentOrderActionReq req
    ) {
        return paymentOrderCrmBiz.expire(id, parseOptionalUserId(actorHeader), req);
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

    @GetMapping("/payment-settings")
    public Result<PaymentSettingsResp> getPaymentSettings() {
        return ok(paymentSettingsBiz.getSettings());
    }

    @PutMapping("/payment-settings")
    public Result<PaymentSettingsResp> updatePaymentSettings(@Valid @RequestBody PaymentSettingsUpdateReq req) {
        return ok(paymentSettingsBiz.updateSettings(req));
    }

    @PostMapping("/payment-settings/test")
    public Result<PaymentSettingsTestResp> testPaymentSettings() {
        return ok(paymentSettingsBiz.testConnection());
    }

    @PostMapping("/redemption-code/generate")
    public Result<List<Map<String, Object>>> generateCodes(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestHeader(value = "X-User-Id", required = false) String actor,
        @RequestBody Map<String, Object> body
    ) {
        AuthRoleSupport.requireAdmin(roles);
        String type = (String) body.get("type");
        String value = (String) body.get("value");
        int count = intValue(body.get("count"), 1);
        int maxUses = intValue(body.get("maxUses"), 1);
        Instant expiresAt = body.get("expiresAt") != null
            ? Instant.parse((String) body.get("expiresAt"))
            : null;
        Long adminId = parseOptionalUserId(actor);
        List<Map<String, Object>> out = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            RedemptionCodeEntity codeEntity = new RedemptionCodeEntity();
            codeEntity.setId(IdWorker.nextIdStr());
            codeEntity.setCode(redemptionCodeGenerator.generate(24));
            codeEntity.setType(type);
            codeEntity.setValue(value);
            codeEntity.setMaxUses(maxUses);
            codeEntity.setUsedCount(0);
            codeEntity.setExpiresAt(expiresAt);
            codeEntity.setCreatedBy(adminId);
            codeEntity.setCreatedAt(Instant.now());
            redemptionCodeRepository.save(codeEntity);
            out.add(Map.of("id", codeEntity.getId(), "code", codeEntity.getCode()));
        }
        return ok(out);
    }

    @GetMapping("/redemption-code/page")
    public Result<Page<RedemptionCodeEntity>> pageCodes(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        AuthRoleSupport.requireAdmin(roles);
        var springPage = redemptionCodeRepository.findAllByOrderByCreatedAtDesc(
            PageRequest.of(Math.max(0, pageCurrent - 1), pageSize)
        );
        return ok(Page.of(springPage.getContent(), springPage.getTotalElements(), pageCurrent, pageSize));
    }

    @DeleteMapping("/redemption-code/{id}")
    public Result<Void> deleteCode(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable String id
    ) {
        AuthRoleSupport.requireAdmin(roles);
        redemptionCodeRepository.deleteById(id);
        return ok();
    }

    @GetMapping("/upgrade-request/page")
    public Result<Page<UpgradeRequestEntity>> pageUpgradeRequests(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        AuthRoleSupport.requireAdmin(roles);
        var springPage = upgradeRequestBiz.list(status, pageCurrent, pageSize);
        return ok(Page.of(springPage.getContent(), springPage.getTotalElements(), pageCurrent, pageSize));
    }

    @PostMapping("/upgrade-request/{id}/approve")
    public Result<Void> approveUpgrade(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestHeader(value = "X-User-Id", required = false) String actor,
        @PathVariable String id,
        @RequestBody Map<String, String> body
    ) {
        AuthRoleSupport.requireAdmin(roles);
        upgradeRequestBiz.approve(id, parseOptionalUserId(actor), body.get("reviewNote"));
        return ok();
    }

    @PostMapping("/upgrade-request/{id}/reject")
    public Result<Void> rejectUpgrade(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestHeader(value = "X-User-Id", required = false) String actor,
        @PathVariable String id,
        @RequestBody Map<String, String> body
    ) {
        AuthRoleSupport.requireAdmin(roles);
        upgradeRequestBiz.reject(id, parseOptionalUserId(actor), body.get("reviewNote"));
        return ok();
    }

    @GetMapping("/balance/{userId}")
    public Result<Map<String, Object>> getBalance(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable Long userId
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return ok(Map.of("balanceMicros", userBalanceBiz.getBalance(userId)));
    }

    @PostMapping("/balance/{userId}/adjust")
    public Result<Void> adjustBalance(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestHeader(value = "X-User-Id", required = false) String actor,
        @PathVariable Long userId,
        @RequestBody Map<String, Object> body
    ) {
        AuthRoleSupport.requireAdmin(roles);
        long delta = ((Number) body.get("deltaMicros")).longValue();
        userBalanceBiz.adjust(userId, delta);
        return ok();
    }

    @GetMapping("/overage")
    public Result<List<UsagePeriodSummaryEntity>> listOverage(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestParam String period
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return ok(usagePeriodSummaryRepository.findByPeriodYyyyMmAndOverageMicrosGreaterThan(period, 0L));
    }

    private static int intValue(Object value, int defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(value.toString());
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
