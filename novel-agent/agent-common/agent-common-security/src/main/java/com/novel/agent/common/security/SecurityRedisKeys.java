package com.novel.agent.common.security;

public final class SecurityRedisKeys {

    public static final String AES_KEY_PREFIX = "auth:aeskey:";
    public static final String NONCE_PREFIX = "auth:nonce:";
    public static final String WS_TICKET_PREFIX = "auth:ws-ticket:";
    public static final String DEVICE_PREFIX = "auth:device:";
    public static final String CRYPTO_MANIFEST_KEY = "crypto:manifest:current";
    /** 当前 bootstrap 元数据（与 Worker crypto-runtime.json 对齐） */
    public static final String CRYPTO_BOOTSTRAP_KEY = "crypto:bootstrap:current";

    private SecurityRedisKeys() {
    }
}
