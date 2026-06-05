package com.novel.agent.gateway.filter;

import com.novel.agent.common.security.SecurityCookieNames;
import com.novel.agent.gateway.config.GatewayClientSecurityProperties;
import com.novel.agent.gateway.support.GatewayAuthSupport;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Set;

@Slf4j
@Component
public class CsrfGatewayFilter implements GlobalFilter, Ordered {

    public static final String CSRF_HEADER = "X-CSRF-Token";

    private static final Set<HttpMethod> MUTATING = Set.of(
        HttpMethod.POST, HttpMethod.PUT, HttpMethod.PATCH, HttpMethod.DELETE
    );

    private final GatewayAuthSupport gatewayAuthSupport;
    private final GatewayClientSecurityProperties properties;

    public CsrfGatewayFilter(
        GatewayAuthSupport gatewayAuthSupport,
        GatewayClientSecurityProperties properties
    ) {
        this.gatewayAuthSupport = gatewayAuthSupport;
        this.properties = properties;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (!properties.enabled()) {
            return chain.filter(exchange);
        }
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        if (gatewayAuthSupport.isCryptoExemptPath(path)) {
            return chain.filter(exchange);
        }
        if (!MUTATING.contains(request.getMethod())) {
            return chain.filter(exchange);
        }

        String headerToken = request.getHeaders().getFirst(CSRF_HEADER);
        String cookieToken = readCookie(request, SecurityCookieNames.CSRF);
        if (cookieToken == null || cookieToken.isBlank()) {
            return chain.filter(exchange);
        }
        if (headerToken != null && headerToken.equals(cookieToken)) {
            return chain.filter(exchange);
        }

        log.warn("csrf mismatch path={} enforce={}", path, properties.enforceCsrf());
        if (properties.enforceCsrf()) {
            return reject(exchange);
        }
        return chain.filter(exchange);
    }

    private static String readCookie(ServerHttpRequest request, String name) {
        if (!request.getCookies().containsKey(name)) {
            return null;
        }
        return request.getCookies().getFirst(name).getValue();
    }

    private Mono<Void> reject(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
        exchange.getResponse().getHeaders().add("Content-Type", "application/json;charset=UTF-8");
        String body = "{\"code\":403,\"message\":\"CSRF_INVALID\"}";
        return exchange.getResponse().writeWith(
            Mono.just(exchange.getResponse().bufferFactory().wrap(body.getBytes()))
        );
    }

    @Override
    public int getOrder() {
        return -110;
    }
}
