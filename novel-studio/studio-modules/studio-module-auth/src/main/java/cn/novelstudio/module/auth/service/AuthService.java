package cn.novelstudio.module.auth.service;

import cn.novelstudio.module.auth.dto.HeartbeatRequest;
import cn.novelstudio.module.auth.dto.WsTicketRequest;
import cn.novelstudio.module.auth.dto.WsTicketResponse;
import cn.novelstudio.module.auth.dto.LoginRequest;
import cn.novelstudio.module.auth.dto.RegisterRequest;
import cn.novelstudio.module.auth.security.JwtAuthService;

public interface AuthService {

    JwtAuthService.AuthSessionBundle login(LoginRequest request);

    void register(RegisterRequest request, String ip, String fingerprint);

    JwtAuthService.AuthSessionBundle refresh(String refreshToken);

    void logout(String refreshToken);

    Long getCurrentUserId(String authorizationHeader);

    void heartbeat(String authorizationHeader, HeartbeatRequest request);

    WsTicketResponse issueWsTicket(String authorizationHeader, WsTicketRequest request);
}
