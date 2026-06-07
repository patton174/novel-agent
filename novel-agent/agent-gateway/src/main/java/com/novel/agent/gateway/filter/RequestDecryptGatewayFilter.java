package com.novel.agent.gateway.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.security.AesGcmCodec;
import com.novel.agent.common.security.RequestCryptoEnvelope;
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
public class RequestDecryptGatewayFilter implements GlobalFilter, Ordered {

    private static final Set<HttpMethod> BODY_METHODS = Set.of(
        HttpMethod.POST, HttpMethod.PUT, HttpMethod.PATCH
    );

    private final GatewayAuthSupport gatewayAuthSupport;
    private final GatewayClientSecurityProperties properties;
    private final SessionAesKeySupport sessionAesKeySupport;
    private final ObjectMapper objectMapper;

    public RequestDecryptGatewayFilter(
        GatewayAuthSupport gatewayAuthSupport,
        GatewayClientSecurityProperties properties,
        SessionAesKeySupport sessionAesKeySupport,
        ObjectMapper objectMapper
    ) {
        this.gatewayAuthSupport = gatewayAuthSupport;
        this.properties = properties;
        this.sessionAesKeySupport = sessionAesKeySupport;
        this.objectMapper = objectMapper;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        if (gatewayAuthSupport.isCryptoExemptPath(path)) {
            return chain.filter(exchange);
        }
        if (!properties.enabled() && !properties.aesRequired()) {
            return chain.filter(exchange);
        }
        if (!BODY_METHODS.contains(request.getMethod())) {
            return chain.filter(exchange);
        }

        return DataBufferUtils.join(request.getBody())
            .flatMap(buffer -> {
                byte[] raw = new byte[buffer.readableByteCount()];
                buffer.read(raw);
                DataBufferUtils.release(buffer);
                if (raw.length == 0) {
                    return chain.filter(exchange);
                }
                String text = new String(raw, StandardCharsets.UTF_8);
                RequestCryptoEnvelope envelope;
                try {
                    envelope = objectMapper.readValue(text, RequestCryptoEnvelope.class);
                } catch (Exception ex) {
                    if (properties.aesRequired()) {
                        return badRequest(exchange, "AES envelope required");
                    }
                    return replayWithBody(exchange, chain, raw);
                }
                if (!envelope.looksEncrypted()) {
                    if (properties.aesRequired()) {
                        return badRequest(exchange, "AES envelope required");
                    }
                    return replayWithBody(exchange, chain, raw);
                }
                var keyOpt = sessionAesKeySupport.loadKeyBase64(envelope.kid());
                if (keyOpt.isEmpty()) {
                    return badRequest(exchange, "unknown key id");
                }
                try {
                    AesGcmCodec codec = AesGcmCodec.fromBase64Key(keyOpt.get());
                    String plaintext = codec.decryptIvAndCt(envelope.iv(), envelope.ct());
                    byte[] decrypted = plaintext.getBytes(StandardCharsets.UTF_8);
                    ServerWebExchange mutated = exchange.mutate()
                        .request(decorateRequest(request, decrypted, exchange.getResponse().bufferFactory()))
                        .build();
                    if (envelope.nonce() != null) {
                        mutated.getAttributes().put(GatewayExchangeAttributes.CRYPTO_NONCE, envelope.nonce());
                    }
                    if (envelope.ts() != null) {
                        mutated.getAttributes().put(GatewayExchangeAttributes.CRYPTO_TS, envelope.ts());
                    }
                    if (envelope.kid() != null) {
                        mutated.getAttributes().put(GatewayExchangeAttributes.CRYPTO_KID, envelope.kid());
                    }
                    return chain.filter(mutated);
                } catch (Exception ex) {
                    log.warn("request decrypt failed kid={}: {}", envelope.kid(), ex.getMessage());
                    return badRequest(exchange, "decrypt failed");
                }
            })
            .switchIfEmpty(chain.filter(exchange));
    }

    private Mono<Void> replayWithBody(ServerWebExchange exchange, GatewayFilterChain chain, byte[] raw) {
        ServerHttpRequest decorated = decorateRequest(
            exchange.getRequest(),
            raw,
            exchange.getResponse().bufferFactory()
        );
        return chain.filter(exchange.mutate().request(decorated).build());
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
        String safe = message.replace("\"", "'");
        String body = "{\"code\":400,\"message\":\"" + safe + "\"}";
        return exchange.getResponse().writeWith(
            Mono.just(exchange.getResponse().bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8)))
        );
    }

    @Override
    public int getOrder() {
        return -108;
    }
}
