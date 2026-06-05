package com.novel.agent.common.security;

public final class SecurityRedisKeys {

    public static final String AES_KEY_PREFIX = "auth:aeskey:";
    public static final String NONCE_PREFIX = "auth:nonce:";
    public static final String WS_TICKET_PREFIX = "auth:ws-ticket:";
    public static final String DEVICE_PREFIX = "auth:device:";

    private SecurityRedisKeys() {
    }
}
