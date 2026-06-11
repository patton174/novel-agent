package com.novel.agent.gateway.filter;

import com.novel.agent.gateway.config.GatewayClientSecurityProperties;
import com.novel.agent.gateway.support.GatewayAuthSupport;
import com.novel.agent.gateway.support.NonceStoreSupport;
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
public class ReplayGuardGatewayFilter implements GlobalFilter, Ordered {

    private static final long NONCE_TTL_SECONDS = 300;

    private final GatewayAuthSupport gatewayAuthSupport;
    private final GatewayClientSecurityProperties properties;
    private final NonceStoreSupport nonceStoreSupport;

    public ReplayGuardGatewayFilter(
        GatewayAuthSupport gatewayAuthSupport,
        GatewayClientSecurityProperties properties,
        NonceStoreSupport nonceStoreSupport
    ) {
        this.gatewayAuthSupport = gatewayAuthSupport;
        this.properties = properties;
        this.nonceStoreSupport = nonceStoreSupport;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (!properties.enabled()) {
            return chain.filter(exchange);
        }
        ServerHttpRequest request = exchange.getRequest();
        if (gatewayAuthSupport.isCryptoExemptPath(request.getURI().getPath())) {
            return chain.filter(exchange);
        }

        Object nonceObj = exchange.getAttribute(GatewayExchangeAttributes.CRYPTO_NONCE);
        Object tsObj = exchange.getAttribute(GatewayExchangeAttributes.CRYPTO_TS);
        if (nonceObj == null || tsObj == null) {
            return chain.filter(exchange);
        }

        if (Boolean.TRUE.equals(exchange.getAttribute(GatewayExchangeAttributes.REPLAY_GUARD_PASSED))) {
            return chain.filter(exchange);
        }

        long ts = ((Number) tsObj).longValue();
        long windowMs = properties.replayWindowSeconds() * 1000L;
        long now = Instant.now().toEpochMilli();
        if (Math.abs(now - ts) > windowMs) {
            log.warn("replay window exceeded ts={} now={}", ts, now);
            return reject(exchange, "REPLAY_WINDOW");
        }

        String nonce = String.valueOf(nonceObj);
        synchronized (GatewayExchangeAttributes.replayGuardLock(exchange)) {
            if (Boolean.TRUE.equals(exchange.getAttribute(GatewayExchangeAttributes.REPLAY_GUARD_PASSED))) {
                return chain.filter(exchange);
            }
            if (!nonceStoreSupport.tryConsume(nonce, NONCE_TTL_SECONDS)) {
                log.warn("duplicate nonce={} trace={}", nonce, exchange.getRequest().getHeaders().getFirst("X-Trace-Id"));
                return reject(exchange, "REPLAY_NONCE");
            }
            exchange.getAttributes().put(GatewayExchangeAttributes.REPLAY_GUARD_PASSED, Boolean.TRUE);
        }

        return chain.filter(exchange);
    }

    private Mono<Void> reject(ServerWebExchange exchange, String code) {
        if (exchange.getResponse().isCommitted()) {
            return Mono.empty();
        }
        exchange.getResponse().setStatusCode(HttpStatus.BAD_REQUEST);
        exchange.getResponse().getHeaders().set("Content-Type", "application/json;charset=UTF-8");
        String body = "{\"code\":400,\"message\":\"" + code + "\"}";
        return exchange.getResponse().writeWith(
            Mono.just(exchange.getResponse().bufferFactory().wrap(body.getBytes()))
        );
    }

    @Override
    public int getOrder() {
        return -106;
    }
}
