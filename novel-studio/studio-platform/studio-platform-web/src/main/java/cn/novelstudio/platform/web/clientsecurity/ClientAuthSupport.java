package cn.novelstudio.platform.web.clientsecurity;

import cn.novelstudio.platform.security.AuthUnauthorizedException;
import cn.novelstudio.platform.security.JwtCodec;
import cn.novelstudio.platform.security.JwtPrincipal;
import cn.novelstudio.platform.security.WsTicketRecord;
import cn.novelstudio.platform.web.internal.InternalServiceGuard;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Component
public class ClientAuthSupport {

    public static final String USER_ID_HEADER = "X-User-Id";
    public static final String INTERNAL_KEY_HEADER = "X-Internal-Service-Key";
    public static final String USER_NAME_HEADER = "X-User-Name";
    public static final String SESSION_ID_HEADER = "X-Session-Id";
    public static final String USER_ROLES_HEADER = "X-User-Roles";
    public static final String TOKEN_HEADER = "Authorization";
    public static final String LEGACY_TOKEN_HEADER = "satoken";
    public static final String WS_TICKET_PARAM = "ticket";

    private static final List<String> WHITE_LIST = Arrays.asList(
        "/api/auth/api/login",
        "/api/auth/api/register",
        "/api/auth/api/refresh",
        "/api/auth/crypto-config",
        "/api/auth/api/captcha",
        "/api/auth/api/send-email-code",
        "/api/auth/api/confirm-email-verify",
        "/api/auth/api/forgot-password",
        "/api/auth/api/confirm-password-reset",
        "/api/billing/auth/plans",
        "/api/billing/auth/site-content/",
        "/api/billing/auth/settings/public",
        "/api/billing/auth/danmaku",
        "/api/billing/webhook/idatariver",
        "/api/content/media/object",
        "/actuator/health"
    );

    private static final List<String> CRYPTO_EXEMPT = Arrays.asList(
        "/actuator/health",
        "/api/auth/crypto-config",
        "/api/auth/api/captcha/config",
        "/api/agent/run/ws",
        "/api/agent/chat/status/ws",
        "/api/content/media/object",
        "/internal/"
    );

    private static final List<String> WS_PATHS = Arrays.asList(
        "/api/agent/run/ws",
        "/api/agent/chat/status/ws"
    );

    private final JwtCodec jwtCodec;
    private final WsTicketSupport wsTicketSupport;
    private final InternalServiceGuard internalServiceGuard;

    public ClientAuthSupport(
        JwtCodec jwtCodec,
        WsTicketSupport wsTicketSupport,
        InternalServiceGuard internalServiceGuard
    ) {
        this.jwtCodec = jwtCodec;
        this.wsTicketSupport = wsTicketSupport;
        this.internalServiceGuard = internalServiceGuard;
    }

    public boolean isWhitePath(String path) {
        if (path.startsWith("/internal/")) {
            return true;
        }
        return WHITE_LIST.stream().anyMatch(path::startsWith);
    }

    public boolean isCryptoExemptPath(String path) {
        return CRYPTO_EXEMPT.stream().anyMatch(path::startsWith);
    }

    /** 模块间 {@code /internal/*} 调用：校验 {@link #INTERNAL_KEY_HEADER}。 */
    public boolean isTrustedService(HttpServletRequest request) {
        try {
            internalServiceGuard.requireValidKey(request.getHeader(INTERNAL_KEY_HEADER));
            return true;
        } catch (RuntimeException ex) {
            return false;
        }
    }

    /**
     * python-ai 等服务端工具经 {@code /api/content/auth/*} 写章节/记忆：
     * 携带有效 {@link #INTERNAL_KEY_HEADER} + {@link #USER_ID_HEADER}，等同旧 agent-content 信任模型。
     */
    public boolean isTrustedServiceContentAuth(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/content/auth/")) {
            return false;
        }
        try {
            internalServiceGuard.requireValidKey(request.getHeader(INTERNAL_KEY_HEADER));
        } catch (RuntimeException ex) {
            return false;
        }
        String userId = request.getHeader(USER_ID_HEADER);
        return userId != null && !userId.isBlank();
    }

    public HttpServletRequest injectServiceUserHeaders(HttpServletRequest request) {
        String userId = request.getHeader(USER_ID_HEADER).trim();
        Map<String, String> headers = Map.of(
            USER_ID_HEADER, userId,
            USER_NAME_HEADER, userId,
            USER_ROLES_HEADER, "user",
            SESSION_ID_HEADER, ""
        );
        return new UserHeadersHttpServletRequest(request, headers);
    }

    public boolean isWsPath(String path) {
        if (path == null || path.isBlank()) {
            return false;
        }
        return WS_PATHS.stream().anyMatch(ws -> ws.equals(path) || path.startsWith(ws + "/"));
    }

    public JwtPrincipal resolvePrincipal(HttpServletRequest request) {
        String path = request.getRequestURI();
        String ticket = request.getParameter(WS_TICKET_PARAM);
        if (isWsPath(path) && ticket != null && !ticket.isBlank()) {
            WsTicketRecord record = wsTicketSupport.consume(ticket);
            if (record == null) {
                throw new AuthUnauthorizedException("auth.ws_ticket.invalid");
            }
            validateWsTicketBinding(request, record);
            return new JwtPrincipal(
                record.userId(),
                record.sessionId(),
                String.valueOf(record.userId()),
                List.of("user"),
                ticket
            );
        }
        return jwtCodec.parseAccessToken(resolveToken(request));
    }

    private void validateWsTicketBinding(HttpServletRequest request, WsTicketRecord record) {
        if ("run".equalsIgnoreCase(record.purpose())) {
            String runId = request.getParameter("runId");
            if (record.resourceId() != null && runId != null && !record.resourceId().equals(runId)) {
                throw new AuthUnauthorizedException("auth.ws_ticket.run_mismatch");
            }
        }
        if ("status".equalsIgnoreCase(record.purpose())) {
            String sessionId = request.getParameter("sessionId");
            if (record.resourceId() != null && sessionId != null && !record.resourceId().equals(sessionId)) {
                throw new AuthUnauthorizedException("auth.ws_ticket.session_mismatch");
            }
        }
    }

    public String resolveToken(HttpServletRequest request) {
        for (String header : List.of(TOKEN_HEADER, LEGACY_TOKEN_HEADER)) {
            String token = request.getHeader(header);
            if (token != null && !token.isBlank()) {
                return token.trim();
            }
            if (request.getCookies() != null) {
                for (Cookie cookie : request.getCookies()) {
                    if (header.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                        return cookie.getValue().trim();
                    }
                }
            }
        }
        for (String key : List.of(TOKEN_HEADER, LEGACY_TOKEN_HEADER, "token")) {
            String token = request.getParameter(key);
            if (token != null && !token.isBlank()) {
                return token.trim();
            }
        }
        return null;
    }

    public HttpServletRequest injectUserHeaders(HttpServletRequest request, JwtPrincipal principal) {
        Map<String, String> headers = Map.of(
            USER_ID_HEADER, String.valueOf(principal.userId()),
            USER_NAME_HEADER, principal.username() == null ? String.valueOf(principal.userId()) : principal.username(),
            USER_ROLES_HEADER, formatRolesHeader(principal.roles()),
            SESSION_ID_HEADER, principal.sessionId() == null ? "" : principal.sessionId()
        );
        return new UserHeadersHttpServletRequest(request, headers);
    }

    private static String formatRolesHeader(List<String> roles) {
        if (roles == null || roles.isEmpty()) {
            return "user";
        }
        return String.join(",", roles);
    }
}
