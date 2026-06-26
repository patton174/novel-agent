package cn.novelstudio.module.billing.controller.auth;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.billing.dto.PayCheckoutReq;
import cn.novelstudio.module.billing.dto.PayCheckoutResp;
import cn.novelstudio.module.billing.dto.PayPendingResp;
import cn.novelstudio.module.billing.dto.PayOrderStatusResp;
import cn.novelstudio.module.billing.dto.PayStartReq;
import cn.novelstudio.module.billing.dto.PayStartResp;
import cn.novelstudio.module.billing.service.biz.IDataRiverPaymentBiz;
import cn.novelstudio.platform.web.BaseController;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/billing/auth/pay")
@RequiredArgsConstructor
public class BillingPaymentController extends BaseController {

    private final IDataRiverPaymentBiz paymentBiz;

    @PostMapping("/checkout")
    public Result<PayCheckoutResp> checkout(
        @RequestHeader("X-User-Id") String userIdHeader,
        @Valid @RequestBody PayCheckoutReq req
    ) {
        return paymentBiz.checkout(parseUserId(userIdHeader), req);
    }

    @PostMapping("/start")
    public Result<PayStartResp> start(
        @RequestHeader("X-User-Id") String userIdHeader,
        @Valid @RequestBody PayStartReq req
    ) {
        return paymentBiz.startPay(parseUserId(userIdHeader), req);
    }

    @GetMapping("/orders/{orderId}")
    public Result<PayOrderStatusResp> orderStatus(
        @RequestHeader("X-User-Id") String userIdHeader,
        @PathVariable String orderId
    ) {
        return paymentBiz.orderStatus(parseUserId(userIdHeader), orderId);
    }

    @GetMapping("/pending")
    public Result<PayPendingResp> pending(
        @RequestHeader("X-User-Id") String userIdHeader
    ) {
        return paymentBiz.pendingOrder(parseUserId(userIdHeader));
    }
}
