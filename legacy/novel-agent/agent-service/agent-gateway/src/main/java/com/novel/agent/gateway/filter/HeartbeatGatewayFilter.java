package com.novel.agent.gateway.filter;

import com.novel.agent.gateway.config.GatewayClientSecurityProperties;
import com.novel.agent.gateway.support.DeviceSessionSupport;
import com.novel.agent.gateway.support.GatewayAuthSupport;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Instant;

@Slf4j
@Component
public class HeartbeatGatewayFilter implements GlobalFilter, Ordered {

    private final GatewayAuthSupport gatewayAuthSupport;
    private final DeviceSessionSupport deviceSessionSupport;
    private final GatewayClientSecurityProperties properties;

    public HeartbeatGatewayFilter(
        GatewayAuthSupport gatewayAuthSupport,
        DeviceSessionSupport deviceSessionSupport,
        GatewayClientSecurityProperties properties
    ) {
        this.gatewayAuthSupport = gatewayAuthSupport;
        this.deviceSessionSupport = deviceSessionSupport;
        this.properties = properties;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        if (gatewayAuthSupport.isWhitePath(path) || path.startsWith("/api/auth/auth/heartbeat")) {
            return chain.filter(exchange);
        }

        return gatewayAuthSupport.resolvePrincipal(request)
            .flatMap(principal -> deviceSessionSupport.load(principal.sessionId())
                .flatMap(record -> {
                    long silenceMs = properties.heartbeatMaxSilenceSeconds() * 1000L;
                    long age = Instant.now().toEpochMilli() - record.lastHeartbeatAt();
                    if (age > silenceMs) {
                        log.warn(
                            "heartbeat stale sid={} userId={} ageMs={} enforce={}",
                            principal.sessionId(),
                            principal.userId(),
                            age,
                            properties.enforceHeartbeat()
                        );
                        if (properties.enforceHeartbeat()) {
                            return reject(exchange, "HEARTBEAT_REQUIRED");
                        }
                    }
                    return chain.filter(exchange);
                })
                .switchIfEmpty(chain.filter(exchange)))
            .onErrorResume(Exception.class, ex -> chain.filter(exchange));
    }

    private Mono<Void> reject(ServerWebExchange exchange, String code) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().add("Content-Type", "application/json;charset=UTF-8");
        String body = "{\"code\":401,\"message\":\"" + code + "\"}";
        return exchange.getResponse().writeWith(
            Mono.just(exchange.getResponse().bufferFactory().wrap(body.getBytes()))
        );
    }

    @Override
    public int getOrder() {
        return -90;
    }
}
