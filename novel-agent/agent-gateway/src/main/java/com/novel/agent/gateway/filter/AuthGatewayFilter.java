package com.novel.agent.gateway.filter;

import cn.dev33.satoken.exception.NotLoginException;
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

/**
 * 统一鉴权过滤器
 *
 * 功能：
 * 1. 放行登录注册接口
 * 2. 其他接口验证 satoken token
 * 3. 验证通过后，把 userId 放到 header 传给下游服务
 */
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

        return gatewayAuthSupport.resolveUserId(request)
            .flatMap(userId -> {
                ServerHttpRequest modifiedRequest = gatewayAuthSupport.injectUserHeaders(request, userId);
                return chain.filter(exchange.mutate().request(modifiedRequest).build());
            })
            .onErrorResume(NotLoginException.class, ex -> unauthorized(exchange, "登录已过期，请重新登录"))
            .onErrorResume(NumberFormatException.class, ex -> unauthorized(exchange, "登录已过期，请重新登录"));
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().add("Content-Type", "application/json;charset=UTF-8");
        String body = "{\"code\":401,\"message\":\"" + message + "\"}";
        return response.writeWith(Mono.just(response.bufferFactory().wrap(body.getBytes())));
    }

    @Override
    public int getOrder() {
        return -100;
    }
}
