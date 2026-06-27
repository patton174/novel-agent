package cn.novelstudio.module.auth.security;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.module.auth.entity.AuthUser;
import cn.novelstudio.module.auth.support.AuthExceptions;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.UnauthorizedException;
import cn.novelstudio.kernel.tools.IdWorker;
import cn.novelstudio.platform.security.AesGcmCodec;
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
    private final long refreshIdleTtlSeconds;
    private final long refreshAbsoluteTtlSeconds;
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
        @Value("${auth.jwt.refresh-idle-ttl-seconds:604800}") long refreshIdleTtlSeconds,
        @Value("${auth.jwt.refresh-absolute-ttl-seconds:2592000}") long refreshAbsoluteTtlSeconds,
        @Value("${auth.client-security.heartbeat-interval-seconds:60}") int heartbeatIntervalSec,
        @Value("${auth.cookie.secure:false}") boolean cookieSecure,
        @Value("${auth.cookie.domain:}") String cookieDomain
    ) {
        this.jwtCodec = jwtCodec;
        this.sessionBlobCodec = sessionBlobCodec;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.deviceSessionService = deviceSessionService;
        this.refreshIdleTtlSeconds = refreshIdleTtlSeconds;
        this.refreshAbsoluteTtlSeconds = refreshAbsoluteTtlSeconds;
        this.heartbeatIntervalSec = heartbeatIntervalSec;
        this.cookieSecure = cookieSecure;
        this.cookieDomain = cookieDomain == null ? "" : cookieDomain.trim();
    }

    public AuthSessionBundle login(AuthUser user, String fingerprint, Map<String, Object> envSnapshot) {
        long now = Instant.now().toEpochMilli();
        String sessionId = IdWorker.prefixed("sess_");
        String refreshToken = UUID.randomUUID().toString();
        String csrf = UUID.randomUUID().toString().replace("-", "");

        RefreshRecord record = new RefreshRecord(
            user.getId(),
            sessionId,
            user.getUsername(),
            user.getRole(),
            now,
            now
        );
        storeRefresh(refreshToken, record, refreshAbsoluteTtlSeconds);

        SessionCryptoMaterial crypto = issueSessionCrypto(refreshAbsoluteTtlSeconds);
        deviceSessionService.bindSession(user.getId(), sessionId, fingerprint, envSnapshot, refreshAbsoluteTtlSeconds);

        String access = jwtCodec.issueAccessToken(
            user.getId(),
            sessionId,
            user.getUsername(),
            List.of(user.getRole() == null ? "user" : user.getRole())
        );

        String sessionBlob = sessionBlobCodec.encryptToBase64(
            sessionId + "|" + user.getId() + "|" + now
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
            refreshAbsoluteTtlSeconds,
            user
        );
    }

    /**
     * 滑动续期：保持 sessionId，轮换 refresh token；校验 7 天 idle + 30 天 absolute。
     */
    public AuthSessionBundle refresh(
        String refreshToken,
        AuthUser user,
        String fingerprint,
        Map<String, Object> envSnapshot
    ) {
        RefreshRecord record = normalizeRefreshRecord(loadRefresh(refreshToken));
        if (record == null || user == null || !record.userId().equals(user.getId())) {
            throw UnauthorizedException.keyed(ResultCode.AUTH_TOKEN_EXPIRED, "result.auth.token_expired");
        }

        long now = Instant.now().toEpochMilli();
        assertSessionAlive(record, now);
        long remainingSec = remainingSessionSeconds(record, now);

        redisTemplate.delete(REFRESH_PREFIX + refreshToken);
        String newRefreshToken = UUID.randomUUID().toString();
        RefreshRecord updated = record.withLastActivityAt(now);
        storeRefresh(newRefreshToken, updated, remainingSec);

        String sessionId = record.sessionId();
        deviceSessionService.touchHeartbeat(sessionId, user.getId(), fingerprint, envSnapshot);
        deviceSessionService.extendSessionTtl(sessionId, remainingSec);

        String csrf = UUID.randomUUID().toString().replace("-", "");
        SessionCryptoMaterial crypto = issueSessionCrypto(remainingSec);

        String access = jwtCodec.issueAccessToken(
            user.getId(),
            sessionId,
            user.getUsername(),
            List.of(record.role() == null ? "user" : record.role())
        );

        String sessionBlob = sessionBlobCodec.encryptToBase64(
            sessionId + "|" + user.getId() + "|" + now
        );

        return new AuthSessionBundle(
            access,
            newRefreshToken,
            sessionBlob,
            csrf,
            sessionId,
            crypto,
            jwtCodec.accessTtlSeconds(),
            heartbeatIntervalSec,
            remainingSec,
            user
        );
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
            throw UnauthorizedException.keyed("result.framework.not_logged_in");
        }
        return jwtCodec.parseAccessToken(authorizationHeader.trim());
    }

    public Long parseAccessUserId(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw UnauthorizedException.keyed("result.framework.not_logged_in");
        }
        return jwtCodec.parseAccessToken(authorizationHeader.trim()).userId();
    }

    public List<ResponseCookie> buildAuthCookies(AuthSessionBundle bundle) {
        long maxAge = bundle.cookieMaxAgeSeconds() > 0
            ? bundle.cookieMaxAgeSeconds()
            : refreshAbsoluteTtlSeconds;
        ResponseCookie refresh = applyDomain(ResponseCookie.from(SecurityCookieNames.REFRESH, bundle.refreshToken())
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite("Lax")
            .path("/api/auth")
            .maxAge(Duration.ofSeconds(maxAge)));
        ResponseCookie session = applyDomain(ResponseCookie.from(SecurityCookieNames.SESSION, bundle.sessionBlob())
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite("Strict")
            .path("/")
            .maxAge(Duration.ofSeconds(maxAge)));
        ResponseCookie csrf = applyDomain(ResponseCookie.from(SecurityCookieNames.CSRF, bundle.csrfToken())
            .httpOnly(false)
            .secure(cookieSecure)
            .sameSite("Strict")
            .path("/")
            .maxAge(Duration.ofSeconds(maxAge)));
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

    private SessionCryptoMaterial issueSessionCrypto(long ttlSeconds) {
        String keyId = "k_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String aesKeyB64 = AesGcmCodec.randomKeyBase64();
        long expiresAt = Instant.now().plusSeconds(ttlSeconds).toEpochMilli();
        redisTemplate.opsForValue().set(
            AES_KEY_PREFIX + keyId,
            aesKeyB64,
            Duration.ofSeconds(ttlSeconds)
        );
        return new SessionCryptoMaterial(keyId, aesKeyB64, 1, expiresAt);
    }

    private void storeRefresh(String refreshToken, RefreshRecord record, long ttlSeconds) {
        try {
            redisTemplate.opsForValue().set(
                REFRESH_PREFIX + refreshToken,
                objectMapper.writeValueAsString(record),
                Duration.ofSeconds(Math.max(1L, ttlSeconds))
            );
        } catch (JsonProcessingException ex) {
            throw AuthExceptions.internalError("auth.refresh_token_store_failed");
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

    private RefreshRecord normalizeRefreshRecord(RefreshRecord record) {
        if (record == null) {
            return null;
        }
        long now = Instant.now().toEpochMilli();
        long started = record.sessionStartedAt() <= 0 ? now : record.sessionStartedAt();
        long activity = record.lastActivityAt() <= 0 ? now : record.lastActivityAt();
        if (started == record.sessionStartedAt() && activity == record.lastActivityAt()) {
            return record;
        }
        return new RefreshRecord(
            record.userId(),
            record.sessionId(),
            record.username(),
            record.role(),
            started,
            activity
        );
    }

    private void assertSessionAlive(RefreshRecord record, long now) {
        long idleMs = refreshIdleTtlSeconds * 1000L;
        long absoluteMs = refreshAbsoluteTtlSeconds * 1000L;
        if (now - record.lastActivityAt() > idleMs) {
            log.info("refresh rejected idle sid={} userId={}", record.sessionId(), record.userId());
            throw UnauthorizedException.keyed(ResultCode.AUTH_TOKEN_EXPIRED, "result.auth.session_idle_expired");
        }
        if (now - record.sessionStartedAt() > absoluteMs) {
            log.info("refresh rejected absolute sid={} userId={}", record.sessionId(), record.userId());
            throw UnauthorizedException.keyed(ResultCode.AUTH_TOKEN_EXPIRED, "result.auth.session_absolute_expired");
        }
    }

    private long remainingSessionSeconds(RefreshRecord record, long now) {
        long idleRemainingMs = refreshIdleTtlSeconds * 1000L - (now - record.lastActivityAt());
        long absoluteRemainingMs = refreshAbsoluteTtlSeconds * 1000L - (now - record.sessionStartedAt());
        long remainingMs = Math.min(idleRemainingMs, absoluteRemainingMs);
        if (remainingMs <= 0) {
            throw UnauthorizedException.keyed(ResultCode.AUTH_TOKEN_EXPIRED, "result.auth.token_expired");
        }
        return Math.max(1L, remainingMs / 1000L);
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
        long cookieMaxAgeSeconds,
        AuthUser user
    ) {
    }
}
