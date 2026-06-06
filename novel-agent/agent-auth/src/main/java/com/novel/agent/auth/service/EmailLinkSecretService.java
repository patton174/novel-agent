package com.novel.agent.auth.service;

import com.novel.agent.auth.config.VerificationProperties;
import com.novel.agent.common.security.SecurityRedisKeys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Base64;

/**
 * 邮箱验证链接 HMAC 密钥：部署时 internal API 注册到 Redis，并同步 MW .env.mw。
 * 运行时优先读 Redis，冷启动可从环境变量回填。
 */
@Slf4j
@Service
public class EmailLinkSecretService {

    private final StringRedisTemplate redisTemplate;
    private final VerificationProperties properties;
    private final SecureRandom random = new SecureRandom();

    public EmailLinkSecretService(StringRedisTemplate redisTemplate, VerificationProperties properties) {
        this.redisTemplate = redisTemplate;
        this.properties = properties;
    }

    @PostConstruct
    void seedFromEnvIfMissing() {
        String redisVal = redisTemplate.opsForValue().get(SecurityRedisKeys.EMAIL_LINK_SECRET_KEY);
        if (redisVal != null && !redisVal.isBlank()) {
            return;
        }
        String env = normalize(properties.getEmailLinkSecret());
        if (!env.isBlank()) {
            redisTemplate.opsForValue().set(SecurityRedisKeys.EMAIL_LINK_SECRET_KEY, env);
            log.info("email link secret seeded from env");
        }
    }

    public String ensureSecret() {
        String existing = redisTemplate.opsForValue().get(SecurityRedisKeys.EMAIL_LINK_SECRET_KEY);
        if (existing != null && !existing.isBlank()) {
            return existing;
        }
        String env = normalize(properties.getEmailLinkSecret());
        if (!env.isBlank()) {
            redisTemplate.opsForValue().set(SecurityRedisKeys.EMAIL_LINK_SECRET_KEY, env);
            return env;
        }
        String generated = generateSecret();
        redisTemplate.opsForValue().set(SecurityRedisKeys.EMAIL_LINK_SECRET_KEY, generated);
        log.info("email link secret generated and registered to Redis");
        return generated;
    }

    public String requireSecret() {
        String secret = redisTemplate.opsForValue().get(SecurityRedisKeys.EMAIL_LINK_SECRET_KEY);
        if (secret != null && !secret.isBlank()) {
            return secret;
        }
        secret = normalize(properties.getEmailLinkSecret());
        if (!secret.isBlank()) {
            return secret;
        }
        throw new IllegalStateException("AUTH_EMAIL_LINK_SECRET not configured");
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String generateSecret() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
