package com.novel.agent.gateway.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.security.AesGcmCodec;
import com.novel.agent.common.security.FieldSecurePayload;
import com.novel.agent.gateway.config.GatewayClientSecurityProperties;
import com.novel.agent.gateway.support.GatewayAuthSupport;
import com.novel.agent.gateway.support.SessionAesKeySupport;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpRequestDecorator;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.Set;

@Slf4j
@Component
public class FieldPayloadExpandGatewayFilter implements GlobalFilter, Ordered {

    private static final Set<HttpMethod> BODY_METHODS = Set.of(
        HttpMethod.POST, HttpMethod.PUT, HttpMethod.PATCH
    );

    private final GatewayClientSecurityProperties properties;
    private final GatewayAuthSupport gatewayAuthSupport;
    private final SessionAesKeySupport sessionAesKeySupport;
    private final ObjectMapper objectMapper;

    public FieldPayloadExpandGatewayFilter(
        GatewayClientSecurityProperties properties,
        GatewayAuthSupport gatewayAuthSupport,
        SessionAesKeySupport sessionAesKeySupport,
        ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.gatewayAuthSupport = gatewayAuthSupport;
        this.sessionAesKeySupport = sessionAesKeySupport;
        this.objectMapper = objectMapper;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (!properties.fieldEncryption()) {
            return chain.filter(exchange);
        }
        ServerHttpRequest request = exchange.getRequest();
        if (gatewayAuthSupport.isCryptoExemptPath(request.getURI().getPath())) {
            return chain.filter(exchange);
        }
        if (!BODY_METHODS.contains(request.getMethod())) {
            return chain.filter(exchange);
        }

        Object kidObj = exchange.getAttribute(GatewayExchangeAttributes.CRYPTO_KID);
        if (kidObj == null) {
            return chain.filter(exchange);
        }
        String kid = String.valueOf(kidObj);
        var keyOpt = sessionAesKeySupport.loadKeyBase64(kid);
        if (keyOpt.isEmpty()) {
            return badRequest(exchange, "unknown key for field expand");
        }

        return DataBufferUtils.join(request.getBody())
            .flatMap(buffer -> {
                byte[] raw = new byte[buffer.readableByteCount()];
                buffer.read(raw);
                DataBufferUtils.release(buffer);
                if (raw.length == 0 || !FieldSecurePayload.looksSecure(objectMapper, raw)) {
                    return chain.filter(exchange);
                }
                try {
                    AesGcmCodec codec = AesGcmCodec.fromBase64Key(keyOpt.get());
                    byte[] expanded = FieldSecurePayload.expand(objectMapper, raw, codec);
                    ServerHttpRequest decorated = decorateRequest(
                        request,
                        expanded,
                        exchange.getResponse().bufferFactory()
                    );
                    return chain.filter(exchange.mutate().request(decorated).build());
                } catch (Exception ex) {
                    log.warn("field payload expand failed: {}", ex.getMessage());
                    return badRequest(exchange, "field expand failed");
                }
            })
            .switchIfEmpty(chain.filter(exchange));
    }

    private ServerHttpRequest decorateRequest(
        ServerHttpRequest request,
        byte[] body,
        org.springframework.core.io.buffer.DataBufferFactory bufferFactory
    ) {
        return new ServerHttpRequestDecorator(request) {
            @Override
            public Flux<DataBuffer> getBody() {
                return Flux.defer(() -> Flux.just(bufferFactory.wrap(body)));
            }

            @Override
            public org.springframework.http.HttpHeaders getHeaders() {
                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.putAll(super.getHeaders());
                headers.setContentLength(body.length);
                headers.setContentType(MediaType.APPLICATION_JSON);
                return headers;
            }
        };
    }

    private Mono<Void> badRequest(ServerWebExchange exchange, String message) {
        exchange.getResponse().setStatusCode(org.springframework.http.HttpStatus.BAD_REQUEST);
        exchange.getResponse().getHeaders().add("Content-Type", "application/json;charset=UTF-8");
        String body = "{\"code\":400,\"message\":\"" + message.replace("\"", "'") + "\"}";
        return exchange.getResponse().writeWith(
            Mono.just(exchange.getResponse().bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8)))
        );
    }

    @Override
    public int getOrder() {
        return -107;
    }
}
