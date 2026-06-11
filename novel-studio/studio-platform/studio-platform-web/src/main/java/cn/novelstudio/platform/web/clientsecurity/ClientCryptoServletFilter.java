package cn.novelstudio.platform.web.clientsecurity;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import cn.novelstudio.platform.security.AesGcmCodec;
import cn.novelstudio.platform.security.FieldSecurePayload;
import cn.novelstudio.platform.security.RequestCryptoEnvelope;
import cn.novelstudio.platform.security.RequestSignCodec;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 41)
@RequiredArgsConstructor
public class ClientCryptoServletFilter extends OncePerRequestFilter {

    private static final Set<String> BODY_METHODS = Set.of("POST", "PUT", "PATCH");
    private static final long NONCE_TTL_SECONDS = 300;

    private final ClientSecurityProperties properties;
    private final ClientAuthSupport clientAuthSupport;
    private final SessionAesKeySupport sessionAesKeySupport;
    private final NonceStoreSupport nonceStoreSupport;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (clientAuthSupport.isCryptoExemptPath(path)) {
            filterChain.doFilter(request, response);
            return;
        }
        if (!properties.enabled() && !properties.aesRequired()) {
            filterChain.doFilter(request, response);
            return;
        }

        boolean envelopeBodySign = BODY_METHODS.contains(request.getMethod());
        Map<String, List<String>> queryParams = RequestSignCodec.parseQuery(request.getQueryString());
        boolean querySign = RequestSignCodec.hasSignQuery(queryParams);

        byte[] raw = BODY_METHODS.contains(request.getMethod())
            ? CachedBodyHttpServletRequest.readBody(request)
            : new byte[0];

        if (!querySign && raw.length == 0 && properties.aesRequired() && envelopeBodySign) {
            ClientSecurityResponses.badRequest(response, "request sign required");
            return;
        }

        HttpServletRequest current = request;
        if (querySign) {
            SignMaterial material = extractSignMaterial(request, raw, envelopeBodySign, queryParams);
            if (material == null) {
                ClientSecurityResponses.badRequest(response, "request sign required");
                return;
            }
            var keyOpt = sessionAesKeySupport.loadKeyBase64(material.kid());
            if (keyOpt.isEmpty()) {
                ClientSecurityResponses.badRequest(response, "unknown sign key");
                return;
            }
            String signedPath = RequestSignCodec.businessPathWithQuery(
                URI.create("http://local" + request.getRequestURI()
                    + (request.getQueryString() == null || request.getQueryString().isBlank()
                    ? "" : "?" + request.getQueryString()))
            );
            boolean ok = RequestSignCodec.verify(
                request.getMethod(),
                signedPath,
                material.ts(),
                material.nonce(),
                material.bodyForHash(),
                keyOpt.get(),
                material.sign()
            );
            if (!ok) {
                log.warn("request sign mismatch path={} kid={}", path, material.kid());
                ClientSecurityResponses.badRequest(response, "invalid sign");
                return;
            }
            request.setAttribute(ClientSecurityAttributes.CRYPTO_TS, material.ts());
            request.setAttribute(ClientSecurityAttributes.CRYPTO_NONCE, material.nonce());
            request.setAttribute(ClientSecurityAttributes.CRYPTO_KID, material.kid());
            if (querySign) {
            URI stripped = RequestSignCodec.stripSignQuery(
                URI.create("http://local" + request.getRequestURI()
                    + (request.getQueryString() == null || request.getQueryString().isBlank()
                    ? "" : "?" + request.getQueryString()))
            );
                current = new RewrittenPathHttpServletRequest(
                    request,
                    stripped.getPath(),
                    stripped.getQuery()
                );
            }
        } else if (properties.enabled() && properties.aesRequired() && envelopeBodySign && raw.length > 0) {
            ClientSecurityResponses.badRequest(response, "request sign required");
            return;
        }

        if (BODY_METHODS.contains(request.getMethod()) && raw.length > 0) {
            byte[] body = raw;
            try {
                RequestCryptoEnvelope envelope = objectMapper.readValue(raw, RequestCryptoEnvelope.class);
                if (envelope.looksEncrypted()) {
                    var keyOpt = sessionAesKeySupport.loadKeyBase64(envelope.kid());
                    if (keyOpt.isEmpty()) {
                        ClientSecurityResponses.badRequest(response, "unknown key id");
                        return;
                    }
                    AesGcmCodec codec = AesGcmCodec.fromBase64Key(keyOpt.get());
                    String plaintext = codec.decryptIvAndCt(envelope.iv(), envelope.ct());
                    body = plaintext.getBytes(StandardCharsets.UTF_8);
                    if (envelope.nonce() != null) {
                        current.setAttribute(ClientSecurityAttributes.CRYPTO_NONCE, envelope.nonce());
                    }
                    if (envelope.ts() != null) {
                        current.setAttribute(ClientSecurityAttributes.CRYPTO_TS, envelope.ts());
                    }
                    if (envelope.kid() != null) {
                        current.setAttribute(ClientSecurityAttributes.CRYPTO_KID, envelope.kid());
                    }
                } else if (properties.aesRequired()) {
                    ClientSecurityResponses.badRequest(response, "AES envelope required");
                    return;
                }
            } catch (Exception ex) {
                if (properties.aesRequired()) {
                    ClientSecurityResponses.badRequest(response, "AES envelope required");
                    return;
                }
            }

            if (properties.fieldEncryption()) {
                Object kidObj = current.getAttribute(ClientSecurityAttributes.CRYPTO_KID);
                if (kidObj != null && FieldSecurePayload.looksSecure(objectMapper, body)) {
                    var keyOpt = sessionAesKeySupport.loadKeyBase64(String.valueOf(kidObj));
                    if (keyOpt.isEmpty()) {
                        ClientSecurityResponses.badRequest(response, "unknown key for field expand");
                        return;
                    }
                    try {
                        AesGcmCodec codec = AesGcmCodec.fromBase64Key(keyOpt.get());
                        body = FieldSecurePayload.expand(objectMapper, body, codec);
                    } catch (Exception ex) {
                        log.warn("field payload expand failed: {}", ex.getMessage());
                        ClientSecurityResponses.badRequest(response, "field expand failed");
                        return;
                    }
                }
            }
            current = new CachedBodyHttpServletRequest(current, body);
        } else if (raw.length > 0) {
            current = new CachedBodyHttpServletRequest(current, raw);
        }

        if (properties.enabled()) {
            Object nonceObj = current.getAttribute(ClientSecurityAttributes.CRYPTO_NONCE);
            Object tsObj = current.getAttribute(ClientSecurityAttributes.CRYPTO_TS);
            if (nonceObj != null && tsObj != null
                && !Boolean.TRUE.equals(current.getAttribute(ClientSecurityAttributes.REPLAY_GUARD_PASSED))) {
                long ts = ((Number) tsObj).longValue();
                long windowMs = properties.replayWindowSeconds() * 1000L;
                long now = Instant.now().toEpochMilli();
                if (Math.abs(now - ts) > windowMs) {
                    log.warn("replay window exceeded ts={} now={}", ts, now);
                    ClientSecurityResponses.badRequest(response, "REPLAY_WINDOW");
                    return;
                }
                String nonce = String.valueOf(nonceObj);
                synchronized (ClientSecurityAttributes.replayGuardLock(current)) {
                    if (Boolean.TRUE.equals(current.getAttribute(ClientSecurityAttributes.REPLAY_GUARD_PASSED))) {
                        filterChain.doFilter(current, response);
                        return;
                    }
                    if (!nonceStoreSupport.tryConsume(nonce, NONCE_TTL_SECONDS)) {
                        log.warn("duplicate nonce={}", nonce);
                        ClientSecurityResponses.badRequest(response, "REPLAY_NONCE");
                        return;
                    }
                    current.setAttribute(ClientSecurityAttributes.REPLAY_GUARD_PASSED, Boolean.TRUE);
                }
            }
        }

        filterChain.doFilter(current, response);
    }

    private SignMaterial extractSignMaterial(
        HttpServletRequest request,
        byte[] raw,
        boolean envelopeBodySign,
        Map<String, List<String>> queryParams
    ) {
        if (envelopeBodySign && raw.length > 0) {
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
                // fall through
            }
        }
        if (!RequestSignCodec.hasSignQuery(queryParams)) {
            return null;
        }
        String sign = firstQuery(queryParams, RequestSignCodec.Q_SIGN);
        String kid = firstQuery(queryParams, RequestSignCodec.Q_KID);
        String nonce = firstQuery(queryParams, RequestSignCodec.Q_NONCE);
        String tsText = firstQuery(queryParams, RequestSignCodec.Q_TS);
        if (sign == null || kid == null || nonce == null || tsText == null) {
            return null;
        }
        try {
            return new SignMaterial(Long.parseLong(tsText.trim()), nonce, kid, sign, raw);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static String textOrNull(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        String text = node.asText();
        return text == null || text.isBlank() ? null : text;
    }

    private static String firstQuery(Map<String, List<String>> params, String key) {
        List<String> values = params.get(key);
        if (values == null || values.isEmpty()) {
            return null;
        }
        return values.get(0);
    }

    private record SignMaterial(long ts, String nonce, String kid, String sign, byte[] bodyForHash) {
    }
}
