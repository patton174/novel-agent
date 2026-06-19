package com.novel.agent.gateway.config;

import com.novel.agent.common.security.JwtCodec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewaySecurityConfig {

    @Bean
    JwtCodec jwtCodec(
        @Value("${auth.jwt.secret:novel-agent-dev-secret-change-in-production-32}") String secret,
        @Value("${auth.jwt.issuer:novel-agent}") String issuer,
        @Value("${auth.jwt.access-ttl-seconds:3600}") long accessTtlSeconds
    ) {
        return new JwtCodec(secret, issuer, accessTtlSeconds);
    }
}
