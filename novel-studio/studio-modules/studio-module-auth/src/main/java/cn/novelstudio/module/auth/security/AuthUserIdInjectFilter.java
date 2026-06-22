package cn.novelstudio.module.auth.security;

import cn.novelstudio.platform.security.AuthUnauthorizedException;
import cn.novelstudio.platform.security.JwtCodec;
import cn.novelstudio.platform.security.JwtPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 无条件启用的 JWT 鉴权 + userId 注入过滤器。
 *
 * <p>无论 {@code auth.client-security.enabled} 是否开启，本过滤器始终运行，确保：
 * <ul>
 *   <li>非白名单请求必须携带有效 access JWT，否则 401；</li>
 *   <li>鉴权成功后，将 {@code X-User-Id} / {@code X-User-Name} / {@code X-User-Roles}
 *       以 JWT 中的值注入 request（覆盖前端传入的同名 header），controller 读取的
 *       userId 一律来自鉴权结果，前端无法伪造。</li>
 * </ul>
 *
 * <p>这与 {@code ClientAuthServletFilter}（client-security 链，条件启用）职责重叠：
 * 当 client-security 启用时，两者都会注入，但本过滤器 Order 更靠前且注入值一致，
 * 不影响结果；当 client-security 关闭（如本地开发）时，本过滤器仍提供鉴权与注入，
 * 避免 controller 直接信任前端 {@code X-User-Id} 的安全隐患。
 *
 * <p>WS ticket 鉴权（{@code /api/agent/run/ws} 等）仍由 client-security 链负责；
 * 本过滤器对 WS 路径放行，不强制 JWT，避免本地 client-security 关闭时 WS 被阻断。
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 50)
public class AuthUserIdInjectFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(AuthUserIdInjectFilter.class);

    public static final String USER_ID_HEADER = "X-User-Id";
    public static final String USER_NAME_HEADER = "X-User-Name";
    public static final String USER_ROLES_HEADER = "X-User-Roles";
    public static final String SESSION_ID_HEADER = "X-Session-Id";
    public static final String INTERNAL_KEY_HEADER = "X-Internal-Service-Key";
    private static final String AUTH_HEADER = "Authorization";
    private static final String LEGACY_TOKEN_HEADER = "satoken";

    /** 与 ClientAuthSupport.WHITE_LIST 保持一致：公开端点不强制鉴权 */
    private static final List<String> WHITE_LIST = List.of(
        "/api/auth/api/login",
        "/api/auth/api/register",
        "/api/auth/api/refresh",
        "/api/auth/crypto-config",
        "/api/auth/api/captcha",
        "/g/api/auth/api/captcha",
        "/api/auth/api/send-email-code",
        "/api/auth/api/confirm-email-verify",
        "/api/auth/api/forgot-password",
        "/api/auth/api/confirm-password-reset",
        "/api/billing/auth/plans",
        "/api/billing/auth/site-content/",
        "/api/billing/auth/settings/public",
        "/api/billing/auth/danmaku",
        "/actuator/health"
    );

    /** WS 路径走 ticket 鉴权（client-security 链），本过滤器放行 */
    private static final List<String> WS_PATHS = List.of(
        "/api/agent/run/ws",
        "/api/agent/chat/status/ws"
    );

    private final JwtCodec jwtCodec;
    private final String internalServiceKey;

    public AuthUserIdInjectFilter(
        JwtCodec jwtCodec,
        @Value("${agent.internal.service-key:${INTERNAL_SERVICE_KEY:dev-internal-key-change-me}}") String internalServiceKey
    ) {
        this.jwtCodec = jwtCodec;
        this.internalServiceKey = internalServiceKey == null ? "" : internalServiceKey.trim();
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (isTrustedServiceContentAuth(request)) {
            String userId = request.getHeader(USER_ID_HEADER).trim();
            filterChain.doFilter(new InjectedHeadersRequest(request, buildServiceHeaders(userId)), response);
            return;
        }
        if (isWhitePath(path) || isWsPath(path) || path.startsWith("/internal/")) {
            filterChain.doFilter(request, response);
            return;
        }
        String token = resolveToken(request);
        if (token == null || token.isBlank()) {
            unauthorized(response, "未登录或登录已过期");
            return;
        }
        try {
            JwtPrincipal principal = jwtCodec.parseAccessToken(token);
            filterChain.doFilter(new InjectedHeadersRequest(request, buildHeaders(principal)), response);
        } catch (AuthUnauthorizedException ex) {
            unauthorized(response, ex.getMessage());
        } catch (RuntimeException ex) {
            log.debug("access token parse failed path={}: {}", path, ex.getMessage());
            unauthorized(response, "登录已过期，请重新登录");
        }
    }

    private Map<String, String> buildHeaders(JwtPrincipal principal) {
        Map<String, String> headers = new HashMap<>();
        headers.put(USER_ID_HEADER, String.valueOf(principal.userId()));
        headers.put(USER_NAME_HEADER, principal.username() == null ? String.valueOf(principal.userId()) : principal.username());
        headers.put(USER_ROLES_HEADER, principal.roles() == null || principal.roles().isEmpty() ? "user" : String.join(",", principal.roles()));
        if (principal.sessionId() != null) {
            headers.put(SESSION_ID_HEADER, principal.sessionId());
        }
        return headers;
    }

    private Map<String, String> buildServiceHeaders(String userId) {
        Map<String, String> headers = new HashMap<>();
        headers.put(USER_ID_HEADER, userId);
        headers.put(USER_NAME_HEADER, userId);
        headers.put(USER_ROLES_HEADER, "user");
        headers.put(SESSION_ID_HEADER, "");
        return headers;
    }

    private boolean isTrustedServiceContentAuth(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/content/auth/")) {
            return false;
        }
        String presented = request.getHeader(INTERNAL_KEY_HEADER);
        if (presented == null || internalServiceKey.isBlank() || !internalServiceKey.equals(presented.trim())) {
            return false;
        }
        String userId = request.getHeader(USER_ID_HEADER);
        return userId != null && !userId.isBlank();
    }

    private static boolean isWhitePath(String path) {
        return WHITE_LIST.stream().anyMatch(path::startsWith);
    }

    private static boolean isWsPath(String path) {
        if (path == null || path.isBlank()) {
            return false;
        }
        return WS_PATHS.stream().anyMatch(ws -> path.equals(ws) || path.startsWith(ws + "/"));
    }

    private String resolveToken(HttpServletRequest request) {
        for (String header : List.of(AUTH_HEADER, LEGACY_TOKEN_HEADER)) {
            String token = request.getHeader(header);
            if (token != null && !token.isBlank()) {
                return token.trim();
            }
        }
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (AUTH_HEADER.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                    return cookie.getValue().trim();
                }
            }
        }
        return null;
    }

    private static void unauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"code\":401,\"msg\":\"" + message + "\"}");
    }

    /** 覆盖注入的鉴权 header；未注入的 header 透传原始值。 */
    private static final class InjectedHeadersRequest extends HttpServletRequestWrapper {
        private final Map<String, String> injected;

        InjectedHeadersRequest(HttpServletRequest request, Map<String, String> injected) {
            super(request);
            this.injected = injected;
        }

        @Override
        public String getHeader(String name) {
            if (name != null && injected.containsKey(name)) {
                return injected.get(name);
            }
            return super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            if (name != null && injected.containsKey(name)) {
                return Collections.enumeration(List.of(injected.get(name)));
            }
            return super.getHeaders(name);
        }
    }
}
