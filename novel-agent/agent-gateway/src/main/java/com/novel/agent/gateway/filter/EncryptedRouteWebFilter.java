package com.novel.agent.gateway.filter;

import com.novel.agent.common.security.AesGcmCodec;
import com.novel.agent.common.security.RoutePathCodec;
import com.novel.agent.gateway.config.GatewayClientSecurityProperties;
import com.novel.agent.gateway.support.BootstrapRuntimeSupport;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

/**
 * 动态入口 {@code /{apiPathPrefix}/{base64url(aes(method|path))}} → 还原真实 /api/... 路径。
 * 路由映射表仅存服务端 Redis，浏览器只拿到 prefix + 加密密钥。
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 50)
public class EncryptedRouteWebFilter implements WebFilter {

    private final GatewayClientSecurityProperties properties;
    private final BootstrapRuntimeSupport bootstrapRuntimeSupport;

    public EncryptedRouteWebFilter(
        GatewayClientSecurityProperties properties,
        BootstrapRuntimeSupport bootstrapRuntimeSupport
    ) {
        this.properties = properties;
        this.bootstrapRuntimeSupport = bootstrapRuntimeSupport;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        if (!properties.routeObfuscation()) {
            return chain.filter(exchange);
        }
        var runtimeOpt = bootstrapRuntimeSupport.current();
        if (runtimeOpt.isEmpty()) {
            return chain.filter(exchange);
        }
        BootstrapRuntimeSupport.BootstrapRuntime runtime = runtimeOpt.get();
        String prefix = runtime.apiPathPrefix();
        if (prefix == null || prefix.isBlank()) {
            return chain.filter(exchange);
        }
        String normalizedPrefix = prefix.startsWith("/") ? prefix : "/" + prefix;
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        if (!path.startsWith(normalizedPrefix + "/")) {
            return chain.filter(exchange);
        }
        String segment = path.substring(normalizedPrefix.length() + 1);
        int slash = segment.indexOf('/');
        if (slash >= 0) {
            segment = segment.substring(0, slash);
        }
        if (segment.isBlank()) {
            return notFound(exchange, "missing route cipher");
        }
        try {
            AesGcmCodec codec = AesGcmCodec.fromBase64Key(runtime.aesKeyB64());
            RoutePathCodec.RouteSpec spec = RoutePathCodec.decode(segment, codec);
            if (!spec.method().equalsIgnoreCase(request.getMethod().name())) {
                return notFound(exchange, "method mismatch");
            }
            String realPath = spec.path();
            ServerHttpRequest mutated = request.mutate().path(realPath).build();
            return chain.filter(exchange.mutate().request(mutated).build());
        } catch (Exception ex) {
            log.warn("route decrypt failed: {}", ex.getMessage());
            return notFound(exchange, "invalid route cipher");
        }
    }

    private Mono<Void> notFound(ServerWebExchange exchange, String message) {
        exchange.getResponse().setStatusCode(HttpStatus.NOT_FOUND);
        exchange.getResponse().getHeaders().add("Content-Type", "application/json;charset=UTF-8");
        String body = "{\"code\":404,\"message\":\"" + message.replace("\"", "'") + "\"}";
        return exchange.getResponse().writeWith(
            Mono.just(exchange.getResponse().bufferFactory().wrap(body.getBytes()))
        );
    }
}
