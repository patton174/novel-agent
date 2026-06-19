package com.novel.agent.auth.service.impl;

import com.novel.agent.auth.client.BillingSettingsClient;
import com.novel.agent.auth.client.BillingSubscriptionClient;
import com.novel.agent.auth.dto.HeartbeatRequest;
import com.novel.agent.auth.dto.LoginRequest;
import com.novel.agent.auth.dto.LoginResponse;
import com.novel.agent.auth.dto.RegisterRequest;
import com.novel.agent.auth.dto.WsTicketRequest;
import com.novel.agent.auth.dto.WsTicketResponse;
import com.novel.agent.auth.entity.AuthUser;
import com.novel.agent.auth.repository.AuthUserRepository;
import com.novel.agent.auth.security.DeviceSessionService;
import com.novel.agent.auth.security.JwtAuthService;
import com.novel.agent.auth.security.WsTicketService;
import com.novel.agent.auth.service.AuthService;
import com.novel.agent.auth.service.EmailVerificationService;
import com.novel.agent.auth.service.RateLimitService;
import com.novel.agent.auth.support.PermissionSyncPublisher;
import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.common.core.exception.BizException;
import com.novel.agent.common.core.tools.IdWorker;
import com.novel.agent.common.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AuthUserRepository authUserRepository;
    private final PermissionSyncPublisher permissionSyncPublisher;
    private final JwtAuthService jwtAuthService;
    private final DeviceSessionService deviceSessionService;
    private final WsTicketService wsTicketService;
    private final EmailVerificationService emailVerificationService;
    private final RateLimitService rateLimitService;
    private final BillingSubscriptionClient billingSubscriptionClient;
    private final BillingSettingsClient billingSettingsClient;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);

    @Override
    public JwtAuthService.AuthSessionBundle login(LoginRequest request) {
        AuthUser user = authUserRepository.findByUsername(request.getUsername())
            .orElseThrow(() -> BizException.of(ResultCode.AUTH_LOGIN_FAILED));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw BizException.of(ResultCode.AUTH_LOGIN_FAILED);
        }

        if (!user.getIsActive()) {
            throw BizException.of(ResultCode.AUTH_USER_DISABLED);
        }

        if (Boolean.FALSE.equals(user.getEmailVerified())) {
            throw BizException.of(ResultCode.AUTH_EMAIL_NOT_VERIFIED);
        }

        permissionSyncPublisher.publish(user.getId(), user.getRole());

        return jwtAuthService.login(user, request.getFingerprint(), request.getEnvSnapshot());
    }

    @Override
    @Transactional
    public void register(RegisterRequest request, String ip, String fingerprint) {
        if (!billingSettingsClient.isRegistrationEnabled()) {
            throw BizException.of(ResultCode.AUTH_REGISTRATION_DISABLED);
        }
        rateLimitService.checkComposite("register", ip, fingerprint, 3, java.time.Duration.ofHours(1));

        if (authUserRepository.existsByUsername(request.getUsername())) {
            throw BizException.of(ResultCode.AUTH_USERNAME_EXISTS);
        }

        if (authUserRepository.existsByEmail(request.getEmail())) {
            throw BizException.of(ResultCode.AUTH_EMAIL_EXISTS);
        }

        emailVerificationService.verifyRegisterCode(request.getEmail(), request.getEmailCode());

        AuthUser user = new AuthUser();
        user.setId(IdWorker.getId());
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setRole("user");
        user.setPermissions("[\"novel:read\", \"novel:write\"]");
        user.setEmailVerified(true);

        authUserRepository.save(user);
        permissionSyncPublisher.publish(user.getId(), user.getRole());
        billingSubscriptionClient.createDefaultSubscription(user.getId());
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
            throw BizException.of(ResultCode.AUTH_TOKEN_EXPIRED);
        }
        AuthUser user = authUserRepository.findById(userId)
            .orElseThrow(() -> BizException.of(ResultCode.AUTH_TOKEN_EXPIRED));
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
            throw BizException.of(ResultCode.BAD_REQUEST, "purpose 不能为空");
        }
        String purpose = request.getPurpose().trim().toLowerCase();
        String resourceId;
        switch (purpose) {
            case "run" -> {
                if (request.getRunId() == null || request.getRunId().isBlank()) {
                    throw BizException.of(ResultCode.BAD_REQUEST, "runId 不能为空");
                }
                resourceId = request.getRunId().trim();
            }
            case "status" -> {
                if (request.getSessionId() == null || request.getSessionId().isBlank()) {
                    throw BizException.of(ResultCode.BAD_REQUEST, "sessionId 不能为空");
                }
                resourceId = request.getSessionId().trim();
            }
            default -> throw BizException.of(ResultCode.BAD_REQUEST, "不支持的 purpose: " + purpose);
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
