package cn.novelstudio.module.billing.controller.auth;

import cn.novelstudio.module.billing.service.biz.FeatureGateBiz;
import cn.novelstudio.module.billing.service.biz.PlanBiz;
import cn.novelstudio.module.billing.service.biz.SiteContentBiz;
import cn.novelstudio.module.billing.service.biz.SiteSettingsBiz;
import cn.novelstudio.module.billing.service.biz.SubscriptionBiz;
import cn.novelstudio.module.billing.service.biz.UsageQueryBiz;
import cn.novelstudio.kernel.base.Page;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import cn.novelstudio.module.billing.dto.*;
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
