package com.novel.agent.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.security.SecurityRedisKeys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
public class CryptoManifestService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public CryptoManifestService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public Optional<CryptoManifestView> current() {
        String json = redisTemplate.opsForValue().get(SecurityRedisKeys.CRYPTO_MANIFEST_KEY);
        if (json == null || json.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(objectMapper.readValue(json, CryptoManifestView.class));
        } catch (Exception ex) {
            log.warn("crypto manifest parse failed: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    public void publish(CryptoManifestView manifest, long ttlSeconds) {
        try {
            String json = objectMapper.writeValueAsString(manifest);
            if (ttlSeconds > 0) {
                redisTemplate.opsForValue().set(
                    SecurityRedisKeys.CRYPTO_MANIFEST_KEY,
                    json,
                    Duration.ofSeconds(ttlSeconds)
                );
            } else {
                redisTemplate.opsForValue().set(SecurityRedisKeys.CRYPTO_MANIFEST_KEY, json);
            }
        } catch (Exception ex) {
            throw new IllegalStateException("publish crypto manifest failed", ex);
        }
    }

    public record CryptoManifestView(
        long version,
        long expiresAtEpochMs,
        Map<String, RouteEntryView> routes
    ) {
    }

    public record RouteEntryView(String method, String path) {
    }
}
