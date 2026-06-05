package com.novel.agent.gateway.filter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.novel.agent.common.security.RequestSignCodec;
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
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpRequestDecorator;
import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.nio.charset.StandardCharsets;

/**
 * 全方法请求签名：有 envelope 的 POST 从 body.sign 验签；其余从 URL query（_na_*）验签。
 */
@Slf4j
@Component
public class RequestSignGatewayFilter implements GlobalFilter, Ordered {

    private final GatewayClientSecurityProperties properties;
    private final GatewayAuthSupport gatewayAuthSupport;
    private final SessionAesKeySupport sessionAesKeySupport;
    private final ObjectMapper objectMapper;

    public RequestSignGatewayFilter(
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
        if (!properties.enabled()) {
            return chain.filter(exchange);
        }
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        if (gatewayAuthSupport.isCryptoExemptPath(path)) {
            return chain.filter(exchange);
        }

        boolean postWithBodySign = HttpMethod.POST.equals(request.getMethod());
        boolean querySign = RequestSignCodec.hasSignQuery(
            RequestSignCodec.parseQuery(request.getURI().getRawQuery())
        );

        if (!postWithBodySign && !querySign) {
            if (properties.aesRequired()) {
                return badRequest(exchange, "request sign required");
            }
            return chain.filter(exchange);
        }

        return DataBufferUtils.join(request.getBody())
            .flatMap(buffer -> {
                byte[] raw = new byte[0];
                if (buffer != null) {
                    raw = new byte[buffer.readableByteCount()];
                    buffer.read(raw);
                    DataBufferUtils.release(buffer);
                }
                if (!querySign && raw.length == 0 && properties.aesRequired()) {
                    return badRequest(exchange, "request sign required");
                }
                return verifyAndContinue(exchange, chain, request, raw, postWithBodySign, querySign);
            })
            .switchIfEmpty(Mono.defer(() -> {
                if (!querySign && properties.aesRequired()) {
                    return badRequest(exchange, "request sign required");
                }
                return verifyAndContinue(exchange, chain, request, new byte[0], postWithBodySign, querySign);
            }));
    }

    private Mono<Void> verifyAndContinue(
        ServerWebExchange exchange,
        GatewayFilterChain chain,
        ServerHttpRequest request,
        byte[] raw,
        boolean postWithBodySign,
        boolean querySign
    ) {
        SignMaterial material;
        try {
            material = extractSignMaterial(request, raw, postWithBodySign, querySign);
        } catch (SignExtractException ex) {
            return badRequest(exchange, ex.getMessage());
        }

        var keyOpt = sessionAesKeySupport.loadKeyBase64(material.kid());
        if (keyOpt.isEmpty()) {
            return badRequest(exchange, "unknown sign key");
        }

        String signedPath = RequestSignCodec.businessPathWithQuery(request.getURI());

        boolean ok = RequestSignCodec.verify(
            request.getMethod().name(),
            signedPath,
            material.ts(),
            material.nonce(),
            material.bodyForHash(),
            keyOpt.get(),
            material.sign()
        );
        if (!ok) {
            log.warn("request sign mismatch path={} kid={}", request.getURI().getPath(), material.kid());
            return badRequest(exchange, "invalid sign");
        }

        exchange.getAttributes().put(GatewayExchangeAttributes.CRYPTO_TS, material.ts());
        exchange.getAttributes().put(GatewayExchangeAttributes.CRYPTO_NONCE, material.nonce());
        exchange.getAttributes().put(GatewayExchangeAttributes.CRYPTO_KID, material.kid());

        ServerHttpRequest nextRequest = request;
        if (querySign) {
            URI stripped = RequestSignCodec.stripSignQuery(request.getURI());
            nextRequest = request.mutate().uri(stripped).build();
        }

        final byte[] bodyReplay = raw;
        final ServerHttpRequest decoratedRequest = bodyReplay.length > 0
            ? new ServerHttpRequestDecorator(nextRequest) {
                @Override
                public Flux<DataBuffer> getBody() {
                    return Flux.defer(() -> Flux.just(exchange.getResponse().bufferFactory().wrap(bodyReplay)));
                }
            }
            : nextRequest;

        return chain.filter(exchange.mutate().request(decoratedRequest).build());
    }

    private SignMaterial extractSignMaterial(
        ServerHttpRequest request,
        byte[] raw,
        boolean postWithBodySign,
        boolean querySign
    ) throws SignExtractException {
        if (postWithBodySign && raw.length > 0) {
            try {
                JsonNode node = objectMapper.readTree(raw);
                if (node.isObject()) {
                    String sign = textOrNull(node.get("sign"));
                    String kid = textOrNull(node.get("kid"));
                    String nonce = textOrNull(node.get("nonce"));
                    JsonNode tsNode = node.get("ts");
                    if (sign != null && kid != null && nonce != null && tsNode != null && tsNode.canConvertToLong()) {
                        ObjectNode copy = ((ObjectNode) node).deepCopy();
                        copy.remove("sign");
                        byte[] bodyForHash = objectMapper.writeValueAsBytes(copy);
                        return new SignMaterial(tsNode.asLong(), nonce, kid, sign, bodyForHash);
                    }
                }
            } catch (Exception ignored) {
                // 非 envelope body，回退 query 验签
            }
        }

        if (!querySign) {
            throw new SignExtractException("request sign required");
        }

        MultiValueMap<String, String> params = request.getQueryParams();
        String sign = params.getFirst(RequestSignCodec.Q_SIGN);
        String kid = params.getFirst(RequestSignCodec.Q_KID);
        String nonce = params.getFirst(RequestSignCodec.Q_NONCE);
        String tsText = params.getFirst(RequestSignCodec.Q_TS);
        if (sign == null || kid == null || nonce == null || tsText == null) {
            throw new SignExtractException("request sign required");
        }
        long ts;
        try {
            ts = Long.parseLong(tsText.trim());
        } catch (NumberFormatException ex) {
            throw new SignExtractException("invalid sign ts");
        }
        return new SignMaterial(ts, nonce, kid, sign, raw);
    }

    private static String textOrNull(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        String text = node.asText();
        return text == null || text.isBlank() ? null : text;
    }

    private Mono<Void> badRequest(ServerWebExchange exchange, String message) {
        if (exchange.getResponse().isCommitted()) {
            return Mono.empty();
        }
        exchange.getResponse().setStatusCode(org.springframework.http.HttpStatus.BAD_REQUEST);
        exchange.getResponse().getHeaders().set("Content-Type", "application/json;charset=UTF-8");
        String body = "{\"code\":400,\"message\":\"" + message.replace("\"", "'") + "\"}";
        return exchange.getResponse().writeWith(
            Mono.just(exchange.getResponse().bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8)))
        );
    }

    @Override
    public int getOrder() {
        return -109;
    }

    private record SignMaterial(long ts, String nonce, String kid, String sign, byte[] bodyForHash) {
    }

    private static final class SignExtractException extends Exception {
        SignExtractException(String message) {
            super(message);
        }
    }
}
