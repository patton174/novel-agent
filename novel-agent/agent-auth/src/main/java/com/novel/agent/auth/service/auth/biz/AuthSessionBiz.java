package com.novel.agent.auth.service.auth.biz;

import com.novel.agent.auth.dto.HeartbeatRequest;
import com.novel.agent.auth.dto.WsTicketRequest;
import com.novel.agent.auth.dto.WsTicketResponse;
import com.novel.agent.auth.service.AuthService;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
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
