package com.novel.agent.gateway.filter;

import com.novel.agent.gateway.support.GatewayAuthSupport;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class AuthAudienceFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        if (path.startsWith("/api/auth/api/")) {
            return chain.filter(exchange);
        }
        if (!requiresAuthAudience(path)) {
            return chain.filter(exchange);
        }

        String userId = request.getHeaders().getFirst(GatewayAuthSupport.USER_ID_HEADER);
        if (userId == null || userId.isBlank()) {
            return unauthorized(exchange);
        }
        return chain.filter(exchange);
    }

    private static boolean requiresAuthAudience(String path) {
        return path.startsWith("/api/auth/auth/") || path.startsWith("/api/content/auth/");
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        if (exchange.getResponse().isCommitted()) {
            return Mono.empty();
        }
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().set("Content-Type", "application/json;charset=UTF-8");
        String body = "{\"code\":401,\"msg\":\"登录已过期，请重新登录\",\"data\":null}";
        return exchange.getResponse().writeWith(
            Mono.just(exchange.getResponse().bufferFactory().wrap(body.getBytes()))
        );
    }

    @Override
    public int getOrder() {
        return -98;
    }
}
