package cn.novelstudio.platform.web.clientsecurity;

import cn.novelstudio.platform.security.AuthUnauthorizedException;
import cn.novelstudio.platform.security.FingerprintMatcher;
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
@Order(Ordered.HIGHEST_PRECEDENCE + 52)
@RequiredArgsConstructor
public class ClientFingerprintServletFilter extends OncePerRequestFilter {

    public static final String FINGERPRINT_HEADER = "X-Fingerprint";

    private final ClientAuthSupport clientAuthSupport;
    private final DeviceSessionSupport deviceSessionSupport;
    private final ClientSecurityProperties properties;
    private final ClientSecurityResponses securityResponses;

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (clientAuthSupport.isWhitePath(path)) {
            filterChain.doFilter(request, response);
            return;
        }
        String presented = request.getHeader(FINGERPRINT_HEADER);
        if (presented == null || presented.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }
        try {
            var principal = clientAuthSupport.resolvePrincipal(request);
            var recordOpt = deviceSessionSupport.load(principal.sessionId());
            if (recordOpt.isEmpty() || recordOpt.get().fpHash() == null || recordOpt.get().fpHash().isBlank()) {
                filterChain.doFilter(request, response);
                return;
            }
            boolean ok = FingerprintMatcher.matches(
                recordOpt.get().fpHash(),
                presented,
                properties.fingerprintTolerance()
            );
            if (!ok) {
                log.warn(
                    "fingerprint mismatch sid={} userId={} enforce={}",
                    principal.sessionId(),
                    principal.userId(),
                    properties.enforceFingerprint()
                );
                if (properties.enforceFingerprint()) {
                    securityResponses.forbidden(response, "DEVICE_MISMATCH");
                    return;
                }
            }
            filterChain.doFilter(request, response);
        } catch (AuthUnauthorizedException ex) {
            filterChain.doFilter(request, response);
        }
    }
}
