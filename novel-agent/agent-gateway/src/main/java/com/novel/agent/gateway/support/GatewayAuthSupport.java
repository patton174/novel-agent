package com.novel.agent.gateway.support;

import com.novel.agent.common.security.AuthUnauthorizedException;
import com.novel.agent.common.security.JwtCodec;
import com.novel.agent.common.security.JwtPrincipal;
import com.novel.agent.common.security.WsTicketRecord;
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
    public static final String SESSION_ID_HEADER = "X-Session-Id";
    public static final String TOKEN_HEADER = "Authorization";
    public static final String LEGACY_TOKEN_HEADER = "satoken";
    public static final String WS_TICKET_PARAM = "ticket";

    private static final List<String> WHITE_LIST = Arrays.asList(
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/refresh",
        "/api/auth/crypto-manifest",
        "/api/auth/crypto-config",
        "/actuator/health"
    );

    private static final List<String> CRYPTO_EXEMPT = Arrays.asList(
        "/actuator/health"
    );

    private static final List<String> WS_PATHS = Arrays.asList(
        "/api/agent/run/ws",
        "/api/agent/chat/status/ws"
    );

    private final JwtCodec jwtCodec;
    private final WsTicketSupport wsTicketSupport;

    public GatewayAuthSupport(JwtCodec jwtCodec, WsTicketSupport wsTicketSupport) {
        this.jwtCodec = jwtCodec;
        this.wsTicketSupport = wsTicketSupport;
    }

    public boolean isWhitePath(String path) {
        return WHITE_LIST.stream().anyMatch(path::startsWith);
    }

    public boolean isCryptoExemptPath(String path) {
        return CRYPTO_EXEMPT.stream().anyMatch(path::startsWith);
    }

    public boolean isWsPath(String path) {
        return WS_PATHS.stream().anyMatch(path::endsWith);
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
        var query = request.getQueryParams();
        for (String key : List.of(TOKEN_HEADER, LEGACY_TOKEN_HEADER, "token")) {
            String token = query.getFirst(key);
            if (token != null && !token.isBlank()) {
                return token.trim();
            }
        }
        return null;
    }

    public Mono<JwtPrincipal> resolvePrincipal(ServerHttpRequest request) {
        return Mono.fromCallable(() -> resolvePrincipalBlocking(request))
            .subscribeOn(Schedulers.boundedElastic());
    }

    private JwtPrincipal resolvePrincipalBlocking(ServerHttpRequest request) {
        String path = request.getURI().getPath();
        String ticket = request.getQueryParams().getFirst(WS_TICKET_PARAM);
        if (isWsPath(path) && ticket != null && !ticket.isBlank()) {
            WsTicketRecord record = wsTicketSupport.consume(ticket);
            if (record == null) {
                throw new AuthUnauthorizedException("无效或已过期的 WS ticket");
            }
            validateWsTicketBinding(request, record);
            return new JwtPrincipal(
                record.userId(),
                record.sessionId(),
                String.valueOf(record.userId()),
                List.of("user"),
                ticket
            );
        }
        String token = resolveToken(request);
        return jwtCodec.parseAccessToken(token);
    }

    private void validateWsTicketBinding(ServerHttpRequest request, WsTicketRecord record) {
        if ("run".equalsIgnoreCase(record.purpose())) {
            String runId = request.getQueryParams().getFirst("runId");
            if (record.resourceId() != null && runId != null && !record.resourceId().equals(runId)) {
                throw new AuthUnauthorizedException("WS ticket 与 runId 不匹配");
            }
        }
        if ("status".equalsIgnoreCase(record.purpose())) {
            String sessionId = request.getQueryParams().getFirst("sessionId");
            if (record.resourceId() != null && sessionId != null && !record.resourceId().equals(sessionId)) {
                throw new AuthUnauthorizedException("WS ticket 与 sessionId 不匹配");
            }
        }
    }

    public Mono<Long> resolveUserId(ServerHttpRequest request) {
        return resolvePrincipal(request).map(JwtPrincipal::userId);
    }

    public ServerHttpRequest injectUserHeaders(ServerHttpRequest request, JwtPrincipal principal) {
        ServerHttpRequest.Builder builder = request.mutate()
            .header(USER_ID_HEADER, String.valueOf(principal.userId()))
            .header(USER_NAME_HEADER, principal.username() == null ? String.valueOf(principal.userId()) : principal.username());
        if (principal.sessionId() != null && !principal.sessionId().isBlank()) {
            builder.header(SESSION_ID_HEADER, principal.sessionId());
        }
        return builder.build();
    }
}
