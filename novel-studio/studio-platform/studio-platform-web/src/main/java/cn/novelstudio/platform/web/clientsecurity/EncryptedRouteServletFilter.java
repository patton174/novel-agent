package cn.novelstudio.platform.web.clientsecurity;

import cn.novelstudio.platform.security.AesGcmCodec;
import cn.novelstudio.platform.security.RoutePathCodec;
import cn.novelstudio.platform.security.RequestSignCodec;
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
import org.springframework.web.util.ServletRequestPathUtils;

import java.io.IOException;
import java.net.URI;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 40)
@RequiredArgsConstructor
public class EncryptedRouteServletFilter extends OncePerRequestFilter {

    private final BootstrapRuntimeSupport bootstrapRuntimeSupport;
    private final ClientSecurityProperties properties;

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!path.startsWith("/g/")) {
            filterChain.doFilter(request, response);
            return;
        }
        if (!properties.enabled() && !properties.routeObfuscation()) {
            filterChain.doFilter(request, response);
            return;
        }

        var runtimeOpt = bootstrapRuntimeSupport.current();
        if (runtimeOpt.isEmpty()) {
            ClientSecurityResponses.staleCrypto(response, "bootstrap runtime missing");
            return;
        }
        var runtime = runtimeOpt.get();
        String prefix = runtime.apiPathPrefix();
        if (prefix == null || prefix.isBlank()) {
            ClientSecurityResponses.staleCrypto(response, "api path prefix missing");
            return;
        }
        String normalizedPrefix = prefix.startsWith("/") ? prefix : "/" + prefix;
        if (!path.startsWith(normalizedPrefix + "/")) {
            log.warn("route prefix stale: path={} expectedPrefix={}", path, normalizedPrefix);
            ClientSecurityResponses.staleCrypto(response, "route prefix stale");
            return;
        }
        String segment = path.substring(normalizedPrefix.length() + 1);
        int slash = segment.indexOf('/');
        if (slash >= 0) {
            segment = segment.substring(0, slash);
        }
        if (segment.isBlank()) {
            ClientSecurityResponses.staleCrypto(response, "missing route cipher");
            return;
        }
        try {
            AesGcmCodec codec = AesGcmCodec.fromBase64Key(runtime.aesKeyB64());
            RoutePathCodec.RouteSpec spec = RoutePathCodec.decode(segment, codec);
            if (!spec.method().equalsIgnoreCase(request.getMethod())) {
                ClientSecurityResponses.staleCrypto(response, "method mismatch");
                return;
            }
            String realTarget = spec.path();
            int q = realTarget.indexOf('?');
            String pathPart = q >= 0 ? realTarget.substring(0, q) : realTarget;
            String queryPart = q >= 0 ? realTarget.substring(q + 1) : null;
            String mergedQuery = RequestSignCodec.mergeBusinessAndSignQuery(
                queryPart,
                RequestSignCodec.parseQuery(request.getQueryString())
            );
            HttpServletRequest rewritten = new RewrittenPathHttpServletRequest(request, pathPart, mergedQuery);
            ServletRequestPathUtils.clearParsedRequestPath(request);
            filterChain.doFilter(rewritten, response);
        } catch (Exception ex) {
            log.warn("route decrypt failed: {}", ex.getMessage());
            ClientSecurityResponses.staleCrypto(response, "invalid route cipher");
        }
    }
}
