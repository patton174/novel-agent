package com.novel.agent.gateway.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.security.SecurityRedisKeys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
public class CryptoManifestSupport {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public CryptoManifestSupport(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public Optional<CryptoManifestDocument> load() {
        String json = redisTemplate.opsForValue().get(SecurityRedisKeys.CRYPTO_MANIFEST_KEY);
        if (json == null || json.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(objectMapper.readValue(json, CryptoManifestDocument.class));
        } catch (Exception ex) {
            log.warn("invalid crypto manifest in redis: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    public Optional<RouteEntry> resolve(String routeToken, String method) {
        return load()
            .flatMap(doc -> Optional.ofNullable(doc.routes().get(routeToken))
                .filter(entry -> entry.method().equalsIgnoreCase(method)));
    }

    public record CryptoManifestDocument(
        long version,
        long expiresAtEpochMs,
        Map<String, RouteEntry> routes
    ) {
        public CryptoManifestDocument {
            routes = routes == null ? Collections.emptyMap() : routes;
        }
    }

    public record RouteEntry(String method, String path) {
    }
}
