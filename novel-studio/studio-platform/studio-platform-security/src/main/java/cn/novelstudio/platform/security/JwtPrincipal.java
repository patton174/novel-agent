package cn.novelstudio.platform.security;

import java.util.List;

public record JwtPrincipal(
    Long userId,
    String sessionId,
    String username,
    List<String> roles,
    String jwtId
) {
}
