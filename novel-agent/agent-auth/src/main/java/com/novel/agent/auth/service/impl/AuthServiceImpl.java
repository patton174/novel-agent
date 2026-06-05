package com.novel.agent.auth.service.impl;

import com.novel.agent.auth.dto.HeartbeatRequest;
import com.novel.agent.auth.dto.WsTicketRequest;
import com.novel.agent.auth.dto.WsTicketResponse;
import com.novel.agent.auth.dto.LoginRequest;
import com.novel.agent.auth.dto.LoginResponse;
import com.novel.agent.auth.dto.RegisterRequest;
import com.novel.agent.auth.entity.AuthUser;
import com.novel.agent.auth.repository.AuthUserRepository;
import com.novel.agent.auth.security.DeviceSessionService;
import com.novel.agent.auth.security.JwtAuthService;
import com.novel.agent.auth.security.WsTicketService;
import com.novel.agent.common.security.JwtPrincipal;
import com.novel.agent.auth.service.AuthService;
import com.novel.agent.auth.service.EmailVerificationService;
import com.novel.agent.auth.service.RateLimitService;
import com.novel.agent.common.mq.constant.MqTopic;
import com.novel.agent.common.mq.producer.IMessageProducer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class AuthServiceImpl implements AuthService {

    @Autowired
    private AuthUserRepository authUserRepository;

    @Autowired
    private IMessageProducer messageProducer;

    @Autowired
    private JwtAuthService jwtAuthService;

    @Autowired
    private DeviceSessionService deviceSessionService;

    @Autowired
    private WsTicketService wsTicketService;

    @Autowired
    private EmailVerificationService emailVerificationService;

    @Autowired
    private RateLimitService rateLimitService;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);

    @Override
    public JwtAuthService.AuthSessionBundle login(LoginRequest request) {
        AuthUser user = authUserRepository.findByUsername(request.getUsername())
            .orElseThrow(() -> new RuntimeException("用户名或密码错误"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("用户名或密码错误");
        }

        if (!user.getIsActive()) {
            throw new RuntimeException("账号已被禁用");
        }

        if (Boolean.FALSE.equals(user.getEmailVerified())) {
            throw new RuntimeException("请先验证邮箱后再登录");
        }

        try {
            messageProducer.send(MqTopic.PERMISSION, user.getId());
        } catch (Exception e) {
            log.warn("异步发送权限消息失败，不影响登录: {}", e.getMessage());
        }

        return jwtAuthService.login(user, request.getFingerprint(), request.getEnvSnapshot());
    }

    @Override
    @Transactional
    public void register(RegisterRequest request, String ip, String fingerprint) {
        rateLimitService.checkComposite("register", ip, fingerprint, 3, java.time.Duration.ofHours(1));

        if (authUserRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("用户名已存在");
        }

        if (authUserRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("邮箱已被注册");
        }

        emailVerificationService.verifyRegisterCode(request.getEmail(), request.getEmailCode());

        AuthUser user = new AuthUser();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setRole("user");
        user.setPermissions("[\"novel:read\", \"novel:write\"]");
        user.setEmailVerified(true);

        authUserRepository.save(user);
    }

    @Override
    public JwtAuthService.AuthSessionBundle refresh(String refreshToken) {
        return refresh(refreshToken, null, null);
    }

    public JwtAuthService.AuthSessionBundle refresh(
        String refreshToken,
        String fingerprint,
        java.util.Map<String, Object> envSnapshot
    ) {
        Long userId = jwtAuthService.userIdFromRefresh(refreshToken);
        if (userId == null) {
            throw new RuntimeException("登录已过期，请重新登录");
        }
        AuthUser user = authUserRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("登录已过期，请重新登录"));
        return jwtAuthService.refresh(refreshToken, user, fingerprint, envSnapshot);
    }

    @Override
    public void logout(String refreshToken) {
        jwtAuthService.logout(refreshToken);
    }

    @Override
    public Long getCurrentUserId(String authorizationHeader) {
        return jwtAuthService.parseAccessUserId(authorizationHeader);
    }

    @Override
    public void heartbeat(String authorizationHeader, HeartbeatRequest request) {
        JwtPrincipal principal = jwtAuthService.parseAccessPrincipal(authorizationHeader);
        String sessionId = request != null && request.getSid() != null && !request.getSid().isBlank()
            ? request.getSid()
            : principal.sessionId();
        String fingerprint = request == null ? null : request.getFingerprint();
        java.util.Map<String, Object> envDelta = request == null ? null : request.getEnvDelta();
        deviceSessionService.touchHeartbeat(sessionId, principal.userId(), fingerprint, envDelta);
    }

    @Override
    public WsTicketResponse issueWsTicket(String authorizationHeader, WsTicketRequest request) {
        JwtPrincipal principal = jwtAuthService.parseAccessPrincipal(authorizationHeader);
        if (request == null || request.getPurpose() == null || request.getPurpose().isBlank()) {
            throw new RuntimeException("purpose 不能为空");
        }
        String purpose = request.getPurpose().trim().toLowerCase();
        String resourceId;
        switch (purpose) {
            case "run" -> {
                if (request.getRunId() == null || request.getRunId().isBlank()) {
                    throw new RuntimeException("runId 不能为空");
                }
                resourceId = request.getRunId().trim();
            }
            case "status" -> {
                if (request.getSessionId() == null || request.getSessionId().isBlank()) {
                    throw new RuntimeException("sessionId 不能为空");
                }
                resourceId = request.getSessionId().trim();
            }
            default -> throw new RuntimeException("不支持的 purpose: " + purpose);
        }
        String ticket = wsTicketService.issue(
            principal.userId(),
            principal.sessionId(),
            purpose,
            resourceId
        );
        return WsTicketResponse.builder()
            .ticket(ticket)
            .expiresIn(wsTicketService.ticketTtlSeconds())
            .build();
    }

    public static LoginResponse toResponse(JwtAuthService.AuthSessionBundle bundle) {
        AuthUser user = bundle.user();
        return LoginResponse.builder()
            .token(bundle.accessToken())
            .userId(user.getId())
            .username(user.getUsername())
            .role(user.getRole())
            .expiresIn(bundle.expiresIn())
            .sessionCrypto(bundle.sessionCrypto())
            .heartbeatIntervalSec(bundle.heartbeatIntervalSec())
            .sessionId(bundle.sessionId())
            .build();
    }
}
