package com.novel.agent.gateway.filter;

import com.novel.agent.common.security.FingerprintMatcher;
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

@Slf4j
@Component
public class FingerprintGatewayFilter implements GlobalFilter, Ordered {

    public static final String FINGERPRINT_HEADER = "X-Fingerprint";

    private final GatewayAuthSupport gatewayAuthSupport;
    private final DeviceSessionSupport deviceSessionSupport;
    private final GatewayClientSecurityProperties properties;

    public FingerprintGatewayFilter(
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
        if (gatewayAuthSupport.isWhitePath(path)) {
            return chain.filter(exchange);
        }

        String presented = request.getHeaders().getFirst(FINGERPRINT_HEADER);
        if (presented == null || presented.isBlank()) {
            return chain.filter(exchange);
        }

        return gatewayAuthSupport.resolvePrincipal(request)
            .flatMap(principal -> deviceSessionSupport.load(principal.sessionId())
                .flatMap(record -> {
                    if (record.fpHash() == null || record.fpHash().isBlank()) {
                        return chain.filter(exchange);
                    }
                    boolean ok = FingerprintMatcher.matches(
                        record.fpHash(),
                        presented,
                        properties.fingerprintTolerance()
                    );
                    if (!ok) {
                        log.warn(
                            "fingerprint mismatch sid={} userId={} enforce={}",
                            principal.sessionId(),
                            principal.userId(),
                            properties.enforceFingerprint()
                        );
                        if (properties.enforceFingerprint()) {
                            return reject(exchange, "DEVICE_MISMATCH");
                        }
                    }
                    return chain.filter(exchange);
                })
                .switchIfEmpty(chain.filter(exchange)))
            .onErrorResume(Exception.class, ex -> chain.filter(exchange));
    }

    private Mono<Void> reject(ServerWebExchange exchange, String code) {
        exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
        exchange.getResponse().getHeaders().add("Content-Type", "application/json;charset=UTF-8");
        String body = "{\"code\":403,\"message\":\"" + code + "\"}";
        return exchange.getResponse().writeWith(
            Mono.just(exchange.getResponse().bufferFactory().wrap(body.getBytes()))
        );
    }

    @Override
    public int getOrder() {
        return -95;
    }
}
