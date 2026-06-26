package cn.novelstudio.module.auth.security;

import cn.novelstudio.kernel.exception.UnauthorizedException;
import org.springframework.stereotype.Component;

/**
 * 单体模式下优先 JWT subject，避免陈旧 X-User-Id 覆盖新登录会话。
 */
@Component
public class AuthUserIdResolver {

    private final JwtAuthService jwtAuthService;

    public AuthUserIdResolver(JwtAuthService jwtAuthService) {
        this.jwtAuthService = jwtAuthService;
    }

    public Long resolve(String userIdHeader, String authorization) {
        Long fromJwt = tryParseJwtUserId(authorization);
        if (fromJwt != null) {
            return fromJwt;
        }
        if (userIdHeader != null && !userIdHeader.isBlank()) {
            return Long.parseLong(userIdHeader.trim());
        }
        throw UnauthorizedException.keyed("result.framework.missing_auth");
    }

    private Long tryParseJwtUserId(String authorization) {
        if (authorization == null || authorization.isBlank()) {
            return null;
        }
        try {
            return jwtAuthService.parseAccessUserId(authorization);
        } catch (RuntimeException ex) {
            return null;
        }
    }
}
