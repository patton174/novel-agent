package com.novel.agent.auth.controller;

import com.novel.agent.auth.dto.HeartbeatRequest;
import com.novel.agent.auth.dto.WsTicketRequest;
import com.novel.agent.auth.dto.WsTicketResponse;
import com.novel.agent.auth.dto.LoginRequest;
import com.novel.agent.auth.dto.LoginResponse;
import com.novel.agent.auth.dto.RegisterRequest;
import com.novel.agent.auth.security.JwtAuthService;
import com.novel.agent.auth.service.AuthService;
import com.novel.agent.auth.service.RateLimitService;
import com.novel.agent.auth.service.impl.AuthServiceImpl;
import com.novel.agent.auth.support.ClientRequestSupport;
import com.novel.agent.common.security.SecurityCookieNames;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

@Slf4j
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private JwtAuthService jwtAuthService;

    @Autowired
    private ClientRequestSupport clientRequestSupport;

    @Autowired
    private RateLimitService rateLimitService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
        @Valid @RequestBody LoginRequest request,
        HttpServletRequest httpRequest
    ) {
        log.info("登录请求: username={}", request.getUsername());
        rateLimitService.checkComposite(
            "login",
            clientRequestSupport.clientIp(httpRequest),
            request.getFingerprint() != null ? request.getFingerprint() : clientRequestSupport.fingerprint(httpRequest),
            20,
            java.time.Duration.ofMinutes(15)
        );
        JwtAuthService.AuthSessionBundle bundle = authService.login(request);
        return withAuthCookies(AuthServiceImpl.toResponse(bundle), bundle);
    }

    @PostMapping("/register")
    public void register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        log.info("注册请求: username={}", request.getUsername());
        authService.register(
            request,
            clientRequestSupport.clientIp(httpRequest),
            clientRequestSupport.fingerprint(httpRequest)
        );
    }

    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(HttpServletRequest request) {
        String refresh = readCookie(request, SecurityCookieNames.REFRESH);
        JwtAuthService.AuthSessionBundle bundle = authService.refresh(refresh);
        return withAuthCookies(AuthServiceImpl.toResponse(bundle), bundle);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        authService.logout(readCookie(request, SecurityCookieNames.REFRESH));
        return ResponseEntity.noContent()
            .headers(headers -> jwtAuthService.clearAuthCookies().forEach(c -> headers.add(HttpHeaders.SET_COOKIE, c.toString())))
            .build();
    }

    @PostMapping("/heartbeat")
    public ResponseEntity<Void> heartbeat(
        @RequestHeader(value = "Authorization", required = false) String authorization,
        @RequestBody(required = false) HeartbeatRequest request
    ) {
        authService.heartbeat(authorization, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/ws-ticket")
    public WsTicketResponse wsTicket(
        @RequestHeader(value = "Authorization", required = false) String authorization,
        @RequestBody WsTicketRequest request
    ) {
        return authService.issueWsTicket(authorization, request);
    }

    @GetMapping("/info")
    public LoginResponse getCurrentUser(@RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = authService.getCurrentUserId(authorization);
        return LoginResponse.builder()
            .userId(userId)
            .username(String.valueOf(userId))
            .build();
    }

    private ResponseEntity<LoginResponse> withAuthCookies(LoginResponse body, JwtAuthService.AuthSessionBundle bundle) {
        return ResponseEntity.ok()
            .headers(headers -> jwtAuthService.buildAuthCookies(bundle).forEach(c -> headers.add(HttpHeaders.SET_COOKIE, c.toString())))
            .body(body);
    }

    private static String readCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        return Arrays.stream(cookies)
            .filter(c -> name.equals(c.getName()))
            .map(Cookie::getValue)
            .findFirst()
            .orElse(null);
    }
}
