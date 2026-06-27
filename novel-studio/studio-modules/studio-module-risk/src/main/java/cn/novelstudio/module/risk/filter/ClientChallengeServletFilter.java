package cn.novelstudio.module.risk.filter;

import cn.novelstudio.module.risk.config.RiskProperties;
import cn.novelstudio.module.risk.service.SessionChallengeService;
import cn.novelstudio.platform.security.AuthUnauthorizedException;
import cn.novelstudio.platform.web.clientsecurity.ClientAuthSupport;
import cn.novelstudio.platform.web.clientsecurity.ClientSecurityResponses;
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

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 54)
@RequiredArgsConstructor
public class ClientChallengeServletFilter extends OncePerRequestFilter {

    private final RiskProperties properties;
    private final SessionChallengeService challengeService;
    private final ClientAuthSupport clientAuthSupport;
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
        if (isExempt(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            var principal = clientAuthSupport.resolvePrincipal(request);
            if (challengeService.isChallengePending(principal.sessionId())) {
                log.info("challenge required sid={} userId={} path={}", principal.sessionId(), principal.userId(), path);
                securityResponses.challengeRequired(response, "CHALLENGE_REQUIRED");
                return;
            }
            filterChain.doFilter(request, response);
        } catch (AuthUnauthorizedException ex) {
            filterChain.doFilter(request, response);
        }
    }

    private static boolean isExempt(String path) {
        return path.startsWith("/api/auth/api/challenge/")
            || path.startsWith("/api/auth/api/captcha/")
            || path.startsWith("/api/auth/auth/heartbeat")
            || path.startsWith("/api/auth/api/login")
            || path.startsWith("/api/auth/api/refresh")
            || path.startsWith("/api/auth/api/logout")
            || path.startsWith("/api/auth/crypto-config")
            || path.startsWith("/actuator/health")
            || path.startsWith("/internal/");
    }
}
