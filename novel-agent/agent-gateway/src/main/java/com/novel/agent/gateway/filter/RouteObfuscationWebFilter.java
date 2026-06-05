package com.novel.agent.gateway.filter;

import com.novel.agent.gateway.config.GatewayClientSecurityProperties;
import com.novel.agent.gateway.support.CryptoManifestSupport;
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
 * 须在 Spring Cloud Gateway 路由匹配之前还原 /api/x/{token}，否则 /api/x/** 无 route 会直接 404。
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 50)
public class RouteObfuscationWebFilter implements WebFilter {

    private static final String OPAQUE_PREFIX = "/api/x/";

    private final GatewayClientSecurityProperties properties;
    private final CryptoManifestSupport manifestSupport;

    public RouteObfuscationWebFilter(
        GatewayClientSecurityProperties properties,
        CryptoManifestSupport manifestSupport
    ) {
        this.properties = properties;
        this.manifestSupport = manifestSupport;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        if (!properties.routeObfuscation()) {
            return chain.filter(exchange);
        }
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        if (!path.startsWith(OPAQUE_PREFIX)) {
            return chain.filter(exchange);
        }
        String remainder = path.substring(OPAQUE_PREFIX.length());
        int slash = remainder.indexOf('/');
        String token = slash >= 0 ? remainder.substring(0, slash) : remainder;
        String suffix = slash >= 0 ? remainder.substring(slash) : "";

        var entryOpt = manifestSupport.resolve(token, request.getMethod().name());
        if (entryOpt.isEmpty()) {
            return notFound(exchange, "unknown route token");
        }
        String realPath = entryOpt.get().path();
        if (realPath.contains("{")) {
            realPath = realPath.replaceAll("\\{[^}]+}", "").replaceAll("/+$", "");
        }
        if (!suffix.isEmpty()) {
            realPath = realPath + suffix;
        }
        ServerHttpRequest mutated = request.mutate().path(realPath).build();
        return chain.filter(exchange.mutate().request(mutated).build());
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
