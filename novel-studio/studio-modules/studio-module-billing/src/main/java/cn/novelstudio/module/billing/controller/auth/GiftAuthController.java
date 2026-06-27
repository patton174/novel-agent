package cn.novelstudio.module.billing.controller.auth;

import cn.novelstudio.module.billing.dto.GiftRedeemReq;
import cn.novelstudio.module.billing.dto.GiftRedeemResp;
import cn.novelstudio.module.billing.service.biz.GiftRedeemBiz;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import cn.novelstudio.platform.web.utils.IpUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/billing/auth/gift")
@RequiredArgsConstructor
public class GiftAuthController extends BaseController {

    private final GiftRedeemBiz giftRedeemBiz;

    @PostMapping("/redeem")
    public Result<GiftRedeemResp> redeem(
        @RequestHeader("X-User-Id") String userIdHeader,
        @Valid @RequestBody GiftRedeemReq req,
        HttpServletRequest request
    ) {
        return giftRedeemBiz.redeem(
            parseUserId(userIdHeader),
            req,
            IpUtils.resolveClientIp(request)
        );
    }
}
