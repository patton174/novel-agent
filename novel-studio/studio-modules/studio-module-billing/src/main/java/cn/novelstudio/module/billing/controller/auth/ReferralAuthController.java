package cn.novelstudio.module.billing.controller.auth;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.billing.dto.UserReferralConversionItem;
import cn.novelstudio.module.billing.dto.UserReferralConversionsResp;
import cn.novelstudio.module.billing.dto.UserReferralResp;
import cn.novelstudio.module.billing.service.biz.ReferralBiz;
import cn.novelstudio.platform.web.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/billing/auth/referral")
@RequiredArgsConstructor
public class ReferralAuthController extends BaseController {

    private final ReferralBiz referralBiz;

    @GetMapping
    public Result<UserReferralResp> getReferral(@RequestHeader("X-User-Id") String userIdHeader) {
        return referralBiz.getUserReferral(parseUserId(userIdHeader));
    }

    @GetMapping("/conversions")
    public Result<UserReferralConversionsResp> listConversions(@RequestHeader("X-User-Id") String userIdHeader) {
        return referralBiz.listConversions(parseUserId(userIdHeader));
    }
}
