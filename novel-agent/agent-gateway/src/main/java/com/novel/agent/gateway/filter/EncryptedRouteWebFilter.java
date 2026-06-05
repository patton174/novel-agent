package com.novel.agent.gateway.filter;

import com.novel.agent.common.security.AesGcmCodec;
import com.novel.agent.common.security.RoutePathCodec;
import com.novel.agent.common.security.RequestSignCodec;
import com.novel.agent.gateway.support.BootstrapRuntimeSupport;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashSet;

/**
 * 在 SCG 路由匹配之前还原 {@code /g/{prefix}/{cipher}} → /api/...。
 * GlobalFilter 太晚（路由已按 /g/ 判 404）；必须 WebFilter + GATEWAY_REQUEST_URL_ATTR。
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 50)
public class EncryptedRouteWebFilter implements WebFilter {

    private final BootstrapRuntimeSupport bootstrapRuntimeSupport;

    public EncryptedRouteWebFilter(BootstrapRuntimeSupport bootstrapRuntimeSupport) {
        this.bootstrapRuntimeSupport = bootstrapRuntimeSupport;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        if (!path.startsWith("/g/")) {
            return chain.filter(exchange);
        }

        var runtimeOpt = bootstrapRuntimeSupport.current();
        if (runtimeOpt.isEmpty()) {
            return staleCrypto(exchange, "bootstrap runtime missing");
        }
        BootstrapRuntimeSupport.BootstrapRuntime runtime = runtimeOpt.get();
        String prefix = runtime.apiPathPrefix();
        if (prefix == null || prefix.isBlank()) {
            return staleCrypto(exchange, "api path prefix missing");
        }
        String normalizedPrefix = prefix.startsWith("/") ? prefix : "/" + prefix;
        if (!path.startsWith(normalizedPrefix + "/")) {
            log.warn("route prefix stale: path={} expectedPrefix={}", path, normalizedPrefix);
            return staleCrypto(exchange, "route prefix stale");
        }
        String segment = path.substring(normalizedPrefix.length() + 1);
        int slash = segment.indexOf('/');
        if (slash >= 0) {
            segment = segment.substring(0, slash);
        }
        if (segment.isBlank()) {
            return staleCrypto(exchange, "missing route cipher");
        }
        try {
            AesGcmCodec codec = AesGcmCodec.fromBase64Key(runtime.aesKeyB64());
            RoutePathCodec.RouteSpec spec = RoutePathCodec.decode(segment, codec);
            if (!spec.method().equalsIgnoreCase(request.getMethod().name())) {
                return staleCrypto(exchange, "method mismatch");
            }
            String realTarget = spec.path();
            int q = realTarget.indexOf('?');
            String pathPart = q >= 0 ? realTarget.substring(0, q) : realTarget;
            String queryPart = q >= 0 ? realTarget.substring(q + 1) : null;
            String mergedQuery = RequestSignCodec.mergeBusinessAndSignQuery(
                queryPart,
                RequestSignCodec.parseQuery(request.getURI().getRawQuery())
            );
            URI newUri = UriComponentsBuilder.fromUri(request.getURI())
                .replacePath(pathPart)
                .replaceQuery(mergedQuery)
                .build(true)
                .toUri();
            ServerHttpRequest mutated = request.mutate().uri(newUri).build();
            LinkedHashSet<URI> gatewayUrls = new LinkedHashSet<>();
            gatewayUrls.add(newUri);
            exchange.getAttributes().put(ServerWebExchangeUtils.GATEWAY_REQUEST_URL_ATTR, gatewayUrls);
            ServerWebExchangeUtils.addOriginalRequestUrl(exchange, request.getURI());
            return chain.filter(exchange.mutate().request(mutated).build());
        } catch (Exception ex) {
            log.warn("route decrypt failed: {}", ex.getMessage());
            return staleCrypto(exchange, "invalid route cipher");
        }
    }

    private Mono<Void> staleCrypto(ServerWebExchange exchange, String message) {
        exchange.getResponse().setStatusCode(HttpStatus.NOT_FOUND);
        exchange.getResponse().getHeaders().set("Content-Type", "application/json;charset=UTF-8");
        exchange.getResponse().getHeaders().set("X-Crypto-Stale", "1");
        String body = "{\"code\":404,\"message\":\"" + message.replace("\"", "'") + "\",\"cryptoStale\":true}";
        return exchange.getResponse().writeWith(
            Mono.just(exchange.getResponse().bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8)))
        );
    }
}
