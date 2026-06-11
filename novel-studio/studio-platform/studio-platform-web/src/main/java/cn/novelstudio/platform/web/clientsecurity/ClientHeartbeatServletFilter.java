package cn.novelstudio.platform.web.clientsecurity;

import cn.novelstudio.platform.security.AuthUnauthorizedException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 53)
@RequiredArgsConstructor
public class ClientHeartbeatServletFilter extends OncePerRequestFilter {

    private final ClientAuthSupport clientAuthSupport;
    private final DeviceSessionSupport deviceSessionSupport;
    private final ClientSecurityProperties properties;

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (clientAuthSupport.isWhitePath(path) || path.startsWith("/api/auth/auth/heartbeat")) {
            filterChain.doFilter(request, response);
            return;
        }
        try {
            var principal = clientAuthSupport.resolvePrincipal(request);
            var recordOpt = deviceSessionSupport.load(principal.sessionId());
            if (recordOpt.isEmpty()) {
                filterChain.doFilter(request, response);
                return;
            }
            long silenceMs = properties.heartbeatMaxSilenceSeconds() * 1000L;
            long age = Instant.now().toEpochMilli() - recordOpt.get().lastHeartbeatAt();
            if (age > silenceMs) {
                log.warn(
                    "heartbeat stale sid={} userId={} ageMs={} enforce={}",
                    principal.sessionId(),
                    principal.userId(),
                    age,
                    properties.enforceHeartbeat()
                );
                if (properties.enforceHeartbeat()) {
                    ClientSecurityResponses.unauthorized(response, "HEARTBEAT_REQUIRED");
                    return;
                }
            }
            filterChain.doFilter(request, response);
        } catch (AuthUnauthorizedException ex) {
            filterChain.doFilter(request, response);
        }
    }
}
