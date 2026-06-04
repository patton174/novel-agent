package com.novel.agent.gateway.support;

import cn.dev33.satoken.exception.NotLoginException;
import cn.dev33.satoken.stp.StpUtil;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.Arrays;
import java.util.List;

@Component
public class GatewayAuthSupport {

    public static final String USER_ID_HEADER = "X-User-Id";
    public static final String USER_NAME_HEADER = "X-User-Name";
    /** 与 auth 服务 sa-token.token-name 保持一致 */
    public static final String TOKEN_HEADER = "Authorization";
    public static final String LEGACY_TOKEN_HEADER = "satoken";
    /** sa-token Redis 键：{token-name}:login:token:{tokenValue} → loginId */
    private static final String TOKEN_REDIS_KEY_PREFIX = TOKEN_HEADER + ":login:token:";

    private static final List<String> WHITE_LIST = Arrays.asList(
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/refresh",
        "/actuator/health"
    );

    private final StringRedisTemplate redisTemplate;

    public GatewayAuthSupport(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public boolean isWhitePath(String path) {
        return WHITE_LIST.stream().anyMatch(path::startsWith);
    }

    public String resolveToken(ServerHttpRequest request) {
        for (String header : List.of(TOKEN_HEADER, LEGACY_TOKEN_HEADER)) {
            String token = request.getHeaders().getFirst(header);
            if (token != null && !token.isBlank()) {
                return token.trim();
            }
            if (request.getCookies().containsKey(header)) {
                return request.getCookies().getFirst(header).getValue();
            }
        }
        // 浏览器 WebSocket 无法自定义 Header，允许 query 传 token（与 sa-token.token-name 一致）
        var query = request.getQueryParams();
        for (String key : List.of(TOKEN_HEADER, LEGACY_TOKEN_HEADER, "token")) {
            String token = query.getFirst(key);
            if (token != null && !token.isBlank()) {
                return token.trim();
            }
        }
        return null;
    }

    public Mono<Long> resolveUserId(ServerHttpRequest request) {
        return Mono.fromCallable(() -> authenticate(request))
            .subscribeOn(Schedulers.boundedElastic());
    }

    /**
     * WebFlux 网关不能依赖 StpUtil 上下文；直接从 Redis 读取 sa-token 写入的 loginId。
     */
    private Long authenticate(ServerHttpRequest request) {
        String token = resolveToken(request);
        if (token == null || token.isBlank()) {
            throw NotLoginException.newInstance(StpUtil.getLoginType(), NotLoginException.NOT_TOKEN, null, null);
        }
        String loginId = redisTemplate.opsForValue().get(TOKEN_REDIS_KEY_PREFIX + token);
        if (loginId == null || loginId.isBlank()) {
            throw NotLoginException.newInstance(StpUtil.getLoginType(), NotLoginException.INVALID_TOKEN, null, null);
        }
        return Long.parseLong(loginId.trim());
    }

    public ServerHttpRequest injectUserHeaders(ServerHttpRequest request, Long userId) {
        return request.mutate()
            .header(USER_ID_HEADER, String.valueOf(userId))
            .header(USER_NAME_HEADER, String.valueOf(userId))
            .build();
    }
}
