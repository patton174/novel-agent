package com.novel.agent.auth.controller.auth;

import com.novel.agent.auth.dto.HeartbeatRequest;
import com.novel.agent.auth.dto.WsTicketRequest;
import com.novel.agent.auth.dto.WsTicketResponse;
import com.novel.agent.auth.service.auth.biz.AuthSessionBiz;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.service.BaseController;
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
