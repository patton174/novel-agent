package com.novel.agent.auth.service;

import com.novel.agent.auth.dto.HeartbeatRequest;
import com.novel.agent.auth.dto.WsTicketRequest;
import com.novel.agent.auth.dto.WsTicketResponse;
import com.novel.agent.auth.dto.LoginRequest;
import com.novel.agent.auth.dto.RegisterRequest;
import com.novel.agent.auth.security.JwtAuthService;

public interface AuthService {

    JwtAuthService.AuthSessionBundle login(LoginRequest request);

    void register(RegisterRequest request, String ip, String fingerprint);

    JwtAuthService.AuthSessionBundle refresh(String refreshToken);

    void logout(String refreshToken);

    Long getCurrentUserId(String authorizationHeader);

    void heartbeat(String authorizationHeader, HeartbeatRequest request);

    WsTicketResponse issueWsTicket(String authorizationHeader, WsTicketRequest request);
}
