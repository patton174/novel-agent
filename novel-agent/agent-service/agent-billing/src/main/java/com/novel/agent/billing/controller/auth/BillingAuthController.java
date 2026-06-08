package com.novel.agent.billing.controller.auth;

import com.novel.agent.billing.service.biz.PlanBiz;
import com.novel.agent.billing.service.biz.SiteContentBiz;
import com.novel.agent.billing.service.biz.SiteSettingsBiz;
import com.novel.agent.billing.service.biz.SubscriptionBiz;
import com.novel.agent.billing.service.biz.UsageQueryBiz;
import com.novel.agent.common.core.base.Page;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.service.BaseController;
import com.novel.agent.billing.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/billing/auth")
@RequiredArgsConstructor
public class BillingAuthController extends BaseController {

    private final PlanBiz planBiz;
    private final UsageQueryBiz usageQueryBiz;
    private final SubscriptionBiz subscriptionBiz;
    private final SiteContentBiz siteContentBiz;
    private final SiteSettingsBiz siteSettingsBiz;
    private final FeatureGateBiz featureGateBiz;

    @GetMapping("/settings/public")
    public Result<PublicSiteSettingsResp> publicSettings() {
        return ok(siteSettingsBiz.publicSettings());
    }

    @GetMapping("/site-content/{key}")
    public Result<SiteContentResp> siteContent(@PathVariable String key) {
        return siteContentBiz.getPublic(key);
    }

    @GetMapping("/plans")
    public Result<List<PlanPublicResp>> plans() {
        return planBiz.listPublicPlans();
    }

    @GetMapping("/usage/current")
    public Result<UsageCurrentResp> currentUsage(@RequestHeader("X-User-Id") String userIdHeader) {
        return usageQueryBiz.currentUsage(parseUserId(userIdHeader));
    }

    @GetMapping("/usage/trends")
    public Result<UsageTrendsResp> trends(
        @RequestHeader("X-User-Id") String userIdHeader,
        @RequestParam(defaultValue = "30") int days
    ) {
        return usageQueryBiz.trends(parseUserId(userIdHeader), days);
    }

    @GetMapping("/usage/events")
    public Result<Page<UsageEventResp>> events(
        @RequestHeader("X-User-Id") String userIdHeader,
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize,
        @RequestParam(required = false) String runId
    ) {
        return usageQueryBiz.listEvents(parseUserId(userIdHeader), pageCurrent, pageSize, runId);
    }

    @GetMapping("/subscription")
    public Result<SubscriptionResp> subscription(@RequestHeader("X-User-Id") String userIdHeader) {
        return subscriptionBiz.getSubscription(parseUserId(userIdHeader));
    }

    @GetMapping("/features")
    public Result<List<String>> features(@RequestHeader("X-User-Id") String userIdHeader) {
        return featureGateBiz.listEnabledFeatures(parseUserId(userIdHeader));
    }
}
