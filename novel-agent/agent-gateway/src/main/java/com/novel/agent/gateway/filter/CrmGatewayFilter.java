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
public class CrmGatewayFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        if (!path.contains("/crm/")) {
            return chain.filter(exchange);
        }

        String roles = request.getHeaders().getFirst(GatewayAuthSupport.USER_ROLES_HEADER);
        if (roles == null || !roles.contains("admin")) {
            return forbidden(exchange);
        }
        return chain.filter(exchange);
    }

    private Mono<Void> forbidden(ServerWebExchange exchange) {
        if (exchange.getResponse().isCommitted()) {
            return Mono.empty();
        }
        exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
        exchange.getResponse().getHeaders().set("Content-Type", "application/json;charset=UTF-8");
        String body = "{\"code\":403,\"message\":\"需要管理员权限\"}";
        return exchange.getResponse().writeWith(
            Mono.just(exchange.getResponse().bufferFactory().wrap(body.getBytes()))
        );
    }

    @Override
    public int getOrder() {
        return -99;
    }
}
