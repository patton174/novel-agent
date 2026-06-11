package cn.novelstudio.module.auth.controller.auth;

import cn.novelstudio.module.auth.dto.HeartbeatRequest;
import cn.novelstudio.module.auth.dto.WsTicketRequest;
import cn.novelstudio.module.auth.dto.WsTicketResponse;
import cn.novelstudio.module.auth.service.auth.biz.AuthSessionBiz;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/auth")
@RequiredArgsConstructor
public class AuthSessionController extends BaseController {

    private final AuthSessionBiz biz;

    @PostMapping("/heartbeat")
    public Result<Void> heartbeat(
        @RequestHeader(value = "Authorization", required = false) String authorization,
        @RequestBody(required = false) HeartbeatRequest request
    ) {
        return biz.heartbeat(authorization, request);
    }

    @PostMapping("/ws-ticket")
    public Result<WsTicketResponse> wsTicket(
        @RequestHeader(value = "Authorization", required = false) String authorization,
        @RequestBody WsTicketRequest request
    ) {
        return biz.issueWsTicket(authorization, request);
    }
}
