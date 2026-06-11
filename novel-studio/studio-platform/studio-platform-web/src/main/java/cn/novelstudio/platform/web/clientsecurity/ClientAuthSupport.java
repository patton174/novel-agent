package cn.novelstudio.platform.web.clientsecurity;

import cn.novelstudio.platform.security.AuthUnauthorizedException;
import cn.novelstudio.platform.security.JwtCodec;
import cn.novelstudio.platform.security.JwtPrincipal;
import cn.novelstudio.platform.security.WsTicketRecord;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Component
public class ClientAuthSupport {

    public static final String USER_ID_HEADER = "X-User-Id";
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
        "/api/billing/auth/plans",
        "/api/billing/auth/site-content/",
        "/api/billing/auth/settings/public",
        "/actuator/health"
    );

    private static final List<String> CRYPTO_EXEMPT = Arrays.asList(
        "/actuator/health",
        "/api/auth/crypto-config"
    );

    private static final List<String> WS_PATHS = Arrays.asList(
        "/api/agent/run/ws",
        "/api/agent/chat/status/ws"
    );

    private final JwtCodec jwtCodec;
    private final WsTicketSupport wsTicketSupport;

    public ClientAuthSupport(JwtCodec jwtCodec, WsTicketSupport wsTicketSupport) {
        this.jwtCodec = jwtCodec;
        this.wsTicketSupport = wsTicketSupport;
    }

    public boolean isWhitePath(String path) {
        return WHITE_LIST.stream().anyMatch(path::startsWith);
    }

    public boolean isCryptoExemptPath(String path) {
        return CRYPTO_EXEMPT.stream().anyMatch(path::startsWith);
    }

    public boolean isWsPath(String path) {
        return WS_PATHS.stream().anyMatch(path::endsWith);
    }

    public JwtPrincipal resolvePrincipal(HttpServletRequest request) {
        String path = request.getRequestURI();
        String ticket = request.getParameter(WS_TICKET_PARAM);
        if (isWsPath(path) && ticket != null && !ticket.isBlank()) {
            WsTicketRecord record = wsTicketSupport.consume(ticket);
            if (record == null) {
                throw new AuthUnauthorizedException("无效或已过期的 WS ticket");
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
                throw new AuthUnauthorizedException("WS ticket 与 runId 不匹配");
            }
        }
        if ("status".equalsIgnoreCase(record.purpose())) {
            String sessionId = request.getParameter("sessionId");
            if (record.resourceId() != null && sessionId != null && !record.resourceId().equals(sessionId)) {
                throw new AuthUnauthorizedException("WS ticket 与 sessionId 不匹配");
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
