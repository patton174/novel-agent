package cn.novelstudio.module.auth.service.auth.biz;

import cn.novelstudio.module.auth.dto.HeartbeatRequest;
import cn.novelstudio.module.auth.dto.WsTicketRequest;
import cn.novelstudio.module.auth.dto.WsTicketResponse;
import cn.novelstudio.module.auth.service.AuthService;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuthSessionBiz extends BaseBiz {

    private final AuthService authService;

    public Result<Void> heartbeat(String authorization, HeartbeatRequest request) {
        authService.heartbeat(authorization, request);
        return ok(null);
    }

    public Result<WsTicketResponse> issueWsTicket(String authorization, WsTicketRequest request) {
        return ok(authService.issueWsTicket(authorization, request));
    }
}
