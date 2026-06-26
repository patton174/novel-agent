package cn.novelstudio.platform.web.clientsecurity;

import cn.novelstudio.platform.security.SecurityCookieNames;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 51)
@RequiredArgsConstructor
public class ClientCsrfServletFilter extends OncePerRequestFilter {

    public static final String CSRF_HEADER = "X-CSRF-Token";
    private static final Set<String> MUTATING = Set.of("POST", "PUT", "PATCH", "DELETE");

    private final ClientAuthSupport clientAuthSupport;
    private final ClientSecurityProperties properties;
    private final ClientSecurityResponses securityResponses;

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        if (!properties.enabled()) {
            filterChain.doFilter(request, response);
            return;
        }
        String path = request.getRequestURI();
        if (clientAuthSupport.isCryptoExemptPath(path)
            || clientAuthSupport.isTrustedServiceContentAuth(request)
            || !MUTATING.contains(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }
        String headerToken = request.getHeader(CSRF_HEADER);
        String cookieToken = readCookie(request, SecurityCookieNames.CSRF);
        if (cookieToken == null || cookieToken.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }
        if (headerToken != null && headerToken.equals(cookieToken)) {
            filterChain.doFilter(request, response);
            return;
        }
        log.warn("csrf mismatch path={} enforce={}", path, properties.enforceCsrf());
        if (properties.enforceCsrf()) {
            securityResponses.forbidden(response, "CSRF_INVALID");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private static String readCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
