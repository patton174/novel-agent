package cn.novelstudio.module.auth.config;

import cn.novelstudio.platform.security.AesGcmCodec;
import cn.novelstudio.platform.security.JwtCodec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AuthSecurityConfig {

    @Bean
    JwtCodec jwtCodec(
        @Value("${auth.jwt.secret:novel-agent-dev-secret-change-in-production-32}") String secret,
        @Value("${auth.jwt.issuer:novel-agent}") String issuer,
        @Value("${auth.jwt.access-ttl-seconds:3600}") long accessTtlSeconds
    ) {
        return new JwtCodec(secret, issuer, accessTtlSeconds);
    }

    @Bean
    AesGcmCodec sessionBlobCodec(
        @Value("${auth.jwt.secret:novel-agent-dev-secret-change-in-production-32}") String secret
    ) {
        byte[] key = secret.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] aesKey = new byte[32];
        System.arraycopy(key, 0, aesKey, 0, Math.min(key.length, 32));
        if (key.length < 32) {
            for (int i = key.length; i < 32; i++) {
                aesKey[i] = (byte) '0';
            }
        }
        return new AesGcmCodec(aesKey);
    }
}
