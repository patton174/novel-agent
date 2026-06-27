package cn.novelstudio.module.billing.controller.crm;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.billing.dto.ReferralStatsResp;
import cn.novelstudio.module.billing.service.biz.ReferralCrmBiz;
import cn.novelstudio.platform.web.AuthRoleSupport;
import cn.novelstudio.platform.web.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/billing/crm/referrals")
@RequiredArgsConstructor
public class ReferralCrmController extends BaseController {

    private final ReferralCrmBiz referralCrmBiz;

    @GetMapping
    public Result<ReferralStatsResp> stats(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestParam(defaultValue = "20") int topLimit
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return referralCrmBiz.stats(topLimit);
    }
}
