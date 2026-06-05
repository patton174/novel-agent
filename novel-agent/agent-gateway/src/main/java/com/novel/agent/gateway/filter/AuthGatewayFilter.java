package com.novel.agent.gateway.filter;

import com.novel.agent.common.security.AuthUnauthorizedException;
import com.novel.agent.gateway.support.GatewayAuthSupport;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class AuthGatewayFilter implements GlobalFilter, Ordered {

    private final GatewayAuthSupport gatewayAuthSupport;

    public AuthGatewayFilter(GatewayAuthSupport gatewayAuthSupport) {
        this.gatewayAuthSupport = gatewayAuthSupport;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        if (gatewayAuthSupport.isWhitePath(path)) {
            return chain.filter(exchange);
        }

        return gatewayAuthSupport.resolvePrincipal(request)
            .flatMap(principal -> {
                ServerHttpRequest modifiedRequest = gatewayAuthSupport.injectUserHeaders(request, principal);
                return chain.filter(exchange.mutate().request(modifiedRequest).build());
            })
            .onErrorResume(AuthUnauthorizedException.class, ex -> unauthorized(exchange, ex.getMessage()))
            .onErrorResume(NumberFormatException.class, ex -> unauthorized(exchange, "登录已过期，请重新登录"));
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().add("Content-Type", "application/json;charset=UTF-8");
        String safe = message == null ? "登录已过期，请重新登录" : message.replace("\"", "'");
        String body = "{\"code\":401,\"message\":\"" + safe + "\"}";
        return response.writeWith(Mono.just(response.bufferFactory().wrap(body.getBytes())));
    }

    @Override
    public int getOrder() {
        return -100;
    }
}
