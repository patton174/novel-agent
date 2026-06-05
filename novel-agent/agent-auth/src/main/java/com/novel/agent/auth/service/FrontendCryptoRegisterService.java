package com.novel.agent.auth.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.auth.support.AuthExceptions;
import com.novel.agent.common.security.AesGcmCodec;
import com.novel.agent.common.security.SecurityRedisKeys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * 前端服务器（Worker）每日 register → 后端签发 bootstrap 密钥 → Worker 写入 env + runtime.json。
 */
@Slf4j
@Service
public class FrontendCryptoRegisterService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public FrontendCryptoRegisterService(
        StringRedisTemplate redisTemplate,
        ObjectMapper objectMapper
    ) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public CryptoRuntimeView registerFromFrontendServer(String hostLabel, long ttlSeconds) {
        long ttl = ttlSeconds > 0 ? ttlSeconds : 86400L * 2;
        String kid = "bf_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String aesKeyB64 = AesGcmCodec.randomKeyBase64();
        String apiPathPrefix = "g/" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        long version = Instant.now().getEpochSecond();
        long expiresAt = Instant.now().plusSeconds(ttl).toEpochMilli();

        redisTemplate.opsForValue().set(
            SecurityRedisKeys.AES_KEY_PREFIX + kid,
            aesKeyB64,
            Duration.ofSeconds(ttl)
        );

        CryptoRuntimeView runtime = new CryptoRuntimeView(
            kid,
            aesKeyB64,
            version,
            expiresAt,
            apiPathPrefix,
            hostLabel == null ? "worker" : hostLabel
        );

        try {
            redisTemplate.opsForValue().set(
                SecurityRedisKeys.CRYPTO_BOOTSTRAP_KEY,
                objectMapper.writeValueAsString(runtime),
                Duration.ofSeconds(ttl)
            );
        } catch (JsonProcessingException ex) {
            throw AuthExceptions.internalError("加密配置写入失败");
        }

        log.info("frontend crypto registered kid={} version={} host={}", kid, version, hostLabel);
        return runtime;
    }

    public Optional<CryptoRuntimeView> currentRuntime() {
        String json = redisTemplate.opsForValue().get(SecurityRedisKeys.CRYPTO_BOOTSTRAP_KEY);
        if (json == null || json.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(objectMapper.readValue(json, CryptoRuntimeView.class));
        } catch (Exception ex) {
            log.warn("bootstrap runtime parse failed: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    public record CryptoRuntimeView(
        String keyId,
        String aesKeyB64,
        long version,
        long expiresAtEpochMs,
        String apiPathPrefix,
        String registeredBy
    ) {
    }
}
