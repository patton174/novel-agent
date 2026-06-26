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
@Order(Ordered.HIGHEST_PRECEDENCE + 30)
@RequiredArgsConstructor
public class EncryptedRouteServletFilter extends OncePerRequestFilter {

    private final BootstrapRuntimeSupport bootstrapRuntimeSupport;
    private final ClientSecurityProperties properties;
    private final ClientSecurityResponses securityResponses;

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
            securityResponses.staleCrypto(response, "security.client.crypto_bootstrap_missing");
            return;
        }
        var runtime = runtimeOpt.get();
        String prefix = runtime.apiPathPrefix();
        if (prefix == null || prefix.isBlank()) {
            securityResponses.staleCrypto(response, "security.client.crypto_api_prefix_missing");
            return;
        }
        String normalizedPrefix = prefix.startsWith("/") ? prefix : "/" + prefix;
        if (!path.startsWith(normalizedPrefix + "/")) {
            log.warn("route prefix stale: path={} expectedPrefix={}", path, normalizedPrefix);
            securityResponses.staleCrypto(response, "security.client.crypto_route_stale");
            return;
        }
        String segment = path.substring(normalizedPrefix.length() + 1);
        int slash = segment.indexOf('/');
        if (slash >= 0) {
            segment = segment.substring(0, slash);
        }
        if (segment.isBlank()) {
            securityResponses.staleCrypto(response, "security.client.crypto_route_cipher_missing");
            return;
        }
        try {
            AesGcmCodec codec = AesGcmCodec.fromBase64Key(runtime.aesKeyB64());
            RoutePathCodec.RouteSpec spec = RoutePathCodec.decode(segment, codec);
            if (!spec.method().equalsIgnoreCase(request.getMethod())) {
                securityResponses.staleCrypto(response, "security.client.crypto_method_mismatch");
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
            securityResponses.staleCrypto(response, "security.client.crypto_route_cipher_invalid");
        }
    }
}
