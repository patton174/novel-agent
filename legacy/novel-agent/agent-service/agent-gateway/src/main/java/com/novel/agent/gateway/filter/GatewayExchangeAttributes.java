package com.novel.agent.gateway.filter;

import org.springframework.web.server.ServerWebExchange;

public final class GatewayExchangeAttributes {

    public static final String CRYPTO_NONCE = "gateway.crypto.nonce";
    public static final String CRYPTO_TS = "gateway.crypto.ts";
    public static final String CRYPTO_KID = "gateway.crypto.kid";
    /** 同一 exchange 防重放已放行（SCG 可能对同一请求多次订阅 filter 链） */
    public static final String REPLAY_GUARD_PASSED = "gateway.replay.guard.passed";
    private static final String REPLAY_GUARD_LOCK = "gateway.replay.guard.lock";

    public static Object replayGuardLock(ServerWebExchange exchange) {
        return exchange.getAttributes().computeIfAbsent(REPLAY_GUARD_LOCK, k -> new Object());
    }

    private GatewayExchangeAttributes() {
    }
}
