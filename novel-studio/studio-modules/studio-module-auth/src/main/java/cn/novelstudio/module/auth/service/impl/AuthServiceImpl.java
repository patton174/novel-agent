package cn.novelstudio.module.auth.service.impl;

import cn.novelstudio.module.auth.client.BillingSettingsClient;
import cn.novelstudio.module.auth.client.BillingSubscriptionClient;
import cn.novelstudio.module.auth.dto.HeartbeatRequest;
import cn.novelstudio.module.auth.dto.LoginRequest;
import cn.novelstudio.module.auth.dto.LoginResponse;
import cn.novelstudio.module.auth.dto.RegisterRequest;
import cn.novelstudio.module.auth.dto.WsTicketRequest;
import cn.novelstudio.module.auth.dto.WsTicketResponse;
import cn.novelstudio.module.auth.entity.AuthUser;
import cn.novelstudio.module.auth.repository.AuthUserRepository;
import cn.novelstudio.module.auth.security.DeviceSessionService;
import cn.novelstudio.module.auth.security.JwtAuthService;
import cn.novelstudio.module.auth.security.WsTicketService;
import cn.novelstudio.module.auth.service.AuthService;
import cn.novelstudio.module.auth.service.EmailVerificationService;
import cn.novelstudio.module.auth.service.RateLimitService;
import cn.novelstudio.module.auth.support.PermissionSyncPublisher;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.tools.IdWorker;
import cn.novelstudio.platform.security.JwtPrincipal;
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
            throw BizException.keyed(ResultCode.BAD_REQUEST, "auth.ws_ticket.purpose_required");
        }
        String purpose = request.getPurpose().trim().toLowerCase();
        String resourceId;
        switch (purpose) {
            case "run" -> {
                if (request.getRunId() == null || request.getRunId().isBlank()) {
                    throw BizException.keyed(ResultCode.BAD_REQUEST, "auth.ws_ticket.run_id_required");
                }
                resourceId = request.getRunId().trim();
            }
            case "status" -> {
                if (request.getSessionId() == null || request.getSessionId().isBlank()) {
                    throw BizException.keyed(ResultCode.BAD_REQUEST, "auth.ws_ticket.session_id_required");
                }
                resourceId = request.getSessionId().trim();
            }
            default -> throw BizException.keyed(ResultCode.BAD_REQUEST, "auth.ws_ticket.purpose_unsupported", purpose);
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
