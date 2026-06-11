package cn.novelstudio.module.auth.security;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.module.auth.entity.AuthUser;
import cn.novelstudio.module.auth.support.AuthExceptions;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.UnauthorizedException;
import cn.novelstudio.kernel.tools.IdWorker;
import cn.novelstudio.platform.security.AesGcmCodec;
import cn.novelstudio.module.auth.support.AuthExceptions;
import cn.novelstudio.platform.security.JwtCodec;
import cn.novelstudio.platform.security.SecurityCookieNames;
import cn.novelstudio.platform.security.SecurityRedisKeys;
import cn.novelstudio.platform.security.SessionCryptoMaterial;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class JwtAuthService {

    private static final String REFRESH_PREFIX = "auth:refresh:";
    private static final String AES_KEY_PREFIX = SecurityRedisKeys.AES_KEY_PREFIX;

    private final JwtCodec jwtCodec;
    private final AesGcmCodec sessionBlobCodec;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final long refreshTtlSeconds;
    private final int heartbeatIntervalSec;
    private final boolean cookieSecure;
    private final String cookieDomain;
    private final DeviceSessionService deviceSessionService;

    public JwtAuthService(
        JwtCodec jwtCodec,
        AesGcmCodec sessionBlobCodec,
        StringRedisTemplate redisTemplate,
        ObjectMapper objectMapper,
        DeviceSessionService deviceSessionService,
        @Value("${auth.jwt.refresh-ttl-seconds:2592000}") long refreshTtlSeconds,
        @Value("${auth.client-security.heartbeat-interval-seconds:60}") int heartbeatIntervalSec,
        @Value("${auth.cookie.secure:false}") boolean cookieSecure,
        @Value("${auth.cookie.domain:}") String cookieDomain
    ) {
        this.jwtCodec = jwtCodec;
        this.sessionBlobCodec = sessionBlobCodec;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.deviceSessionService = deviceSessionService;
        this.refreshTtlSeconds = refreshTtlSeconds;
        this.heartbeatIntervalSec = heartbeatIntervalSec;
        this.cookieSecure = cookieSecure;
        this.cookieDomain = cookieDomain == null ? "" : cookieDomain.trim();
    }

    public AuthSessionBundle login(AuthUser user, String fingerprint, java.util.Map<String, Object> envSnapshot) {
        String sessionId = IdWorker.prefixed("sess_");
        String refreshToken = UUID.randomUUID().toString();
        String csrf = UUID.randomUUID().toString().replace("-", "");

        storeRefresh(refreshToken, user.getId(), sessionId, user.getUsername(), user.getRole());
        SessionCryptoMaterial crypto = issueSessionCrypto(sessionId);
        deviceSessionService.bindSession(user.getId(), sessionId, fingerprint, envSnapshot);

        String access = jwtCodec.issueAccessToken(
            user.getId(),
            sessionId,
            user.getUsername(),
            List.of(user.getRole() == null ? "user" : user.getRole())
        );

        String sessionBlob = sessionBlobCodec.encryptToBase64(
            sessionId + "|" + user.getId() + "|" + Instant.now().toEpochMilli()
        );

        return new AuthSessionBundle(
            access,
            refreshToken,
            sessionBlob,
            csrf,
            sessionId,
            crypto,
            jwtCodec.accessTtlSeconds(),
            heartbeatIntervalSec,
            user
        );
    }

    public AuthSessionBundle refresh(String refreshToken, AuthUser user, String fingerprint, java.util.Map<String, Object> envSnapshot) {
        RefreshRecord record = loadRefresh(refreshToken);
        if (record == null || user == null || !record.userId().equals(user.getId())) {
            throw new UnauthorizedException(ResultCode.AUTH_TOKEN_EXPIRED, "登录已过期，请重新登录");
        }
        redisTemplate.delete(REFRESH_PREFIX + refreshToken);
        deviceSessionService.revokeSession(record.sessionId());
        return login(user, fingerprint, envSnapshot);
    }

    public Long userIdFromRefresh(String refreshToken) {
        RefreshRecord record = loadRefresh(refreshToken);
        return record == null ? null : record.userId();
    }

    public void logout(String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            RefreshRecord record = loadRefresh(refreshToken);
            if (record != null) {
                deviceSessionService.revokeSession(record.sessionId());
            }
            redisTemplate.delete(REFRESH_PREFIX + refreshToken);
        }
    }

    public cn.novelstudio.platform.security.JwtPrincipal parseAccessPrincipal(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw new UnauthorizedException("未登录");
        }
        return jwtCodec.parseAccessToken(authorizationHeader.trim());
    }

    public Long parseAccessUserId(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw new UnauthorizedException("未登录");
        }
        return jwtCodec.parseAccessToken(authorizationHeader.trim()).userId();
    }

    public List<ResponseCookie> buildAuthCookies(AuthSessionBundle bundle) {
        ResponseCookie refresh = applyDomain(ResponseCookie.from(SecurityCookieNames.REFRESH, bundle.refreshToken())
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite("Lax")
            .path("/api/auth")
            .maxAge(Duration.ofSeconds(refreshTtlSeconds)));
        ResponseCookie session = applyDomain(ResponseCookie.from(SecurityCookieNames.SESSION, bundle.sessionBlob())
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite("Strict")
            .path("/")
            .maxAge(Duration.ofSeconds(refreshTtlSeconds)));
        ResponseCookie csrf = applyDomain(ResponseCookie.from(SecurityCookieNames.CSRF, bundle.csrfToken())
            .httpOnly(false)
            .secure(cookieSecure)
            .sameSite("Strict")
            .path("/")
            .maxAge(Duration.ofSeconds(refreshTtlSeconds)));
        return List.of(refresh, session, csrf);
    }

    private ResponseCookie applyDomain(ResponseCookie.ResponseCookieBuilder builder) {
        if (!cookieDomain.isBlank()) {
            builder.domain(cookieDomain);
        }
        return builder.build();
    }

    public List<ResponseCookie> clearAuthCookies() {
        return List.of(
            expireCookie(SecurityCookieNames.REFRESH, "/api/auth"),
            expireCookie(SecurityCookieNames.SESSION, "/"),
            expireCookie(SecurityCookieNames.CSRF, "/")
        );
    }

    private ResponseCookie expireCookie(String name, String path) {
        return applyDomain(ResponseCookie.from(name, "")
            .httpOnly(true)
            .secure(cookieSecure)
            .path(path)
            .maxAge(0));
    }

    private SessionCryptoMaterial issueSessionCrypto(String sessionId) {
        String keyId = "k_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String aesKeyB64 = AesGcmCodec.randomKeyBase64();
        long expiresAt = Instant.now().plusSeconds(refreshTtlSeconds).toEpochMilli();
        redisTemplate.opsForValue().set(
            AES_KEY_PREFIX + keyId,
            aesKeyB64,
            Duration.ofSeconds(refreshTtlSeconds)
        );
        return new SessionCryptoMaterial(keyId, aesKeyB64, 1, expiresAt);
    }

    private void storeRefresh(String refreshToken, Long userId, String sessionId, String username, String role) {
        try {
            RefreshRecord record = new RefreshRecord(userId, sessionId, username, role == null ? "user" : role);
            redisTemplate.opsForValue().set(
                REFRESH_PREFIX + refreshToken,
                objectMapper.writeValueAsString(record),
                Duration.ofSeconds(refreshTtlSeconds)
            );
        } catch (JsonProcessingException ex) {
            throw AuthExceptions.internalError("刷新令牌存储失败");
        }
    }

    private RefreshRecord loadRefresh(String refreshToken) {
        String json = redisTemplate.opsForValue().get(REFRESH_PREFIX + refreshToken);
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, RefreshRecord.class);
        } catch (JsonProcessingException ex) {
            log.warn("invalid refresh record: {}", ex.getMessage());
            return null;
        }
    }

    public record AuthSessionBundle(
        String accessToken,
        String refreshToken,
        String sessionBlob,
        String csrfToken,
        String sessionId,
        SessionCryptoMaterial sessionCrypto,
        long expiresIn,
        int heartbeatIntervalSec,
        AuthUser user
    ) {
    }

    private record RefreshRecord(Long userId, String sessionId, String username, String role) {
    }
}
