package cn.novelstudio.module.auth.service;

import cn.novelstudio.module.auth.dto.HeartbeatRequest;
import cn.novelstudio.module.auth.dto.WsTicketRequest;
import cn.novelstudio.module.auth.dto.WsTicketResponse;
import cn.novelstudio.module.auth.dto.LoginRequest;
import cn.novelstudio.module.auth.dto.RegisterRequest;
import cn.novelstudio.module.auth.security.JwtAuthService;

import java.util.Map;

public interface AuthService {

    JwtAuthService.AuthSessionBundle login(LoginRequest request);

    JwtAuthService.AuthSessionBundle login(LoginRequest request, String clientIp, String clientCountry);

    void register(RegisterRequest request, String ip, String fingerprint, String referralCode);

    JwtAuthService.AuthSessionBundle refresh(String refreshToken);

    JwtAuthService.AuthSessionBundle refresh(
        String refreshToken,
        String fingerprint,
        Map<String, Object> envSnapshot,
        String clientIp,
        String clientCountry
    );

    void logout(String refreshToken);

    Long getCurrentUserId(String authorizationHeader);

    void heartbeat(String authorizationHeader, HeartbeatRequest request);

    WsTicketResponse issueWsTicket(String authorizationHeader, WsTicketRequest request);
}
