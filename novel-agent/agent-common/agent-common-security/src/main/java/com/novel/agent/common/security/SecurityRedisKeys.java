package com.novel.agent.common.security;

public final class SecurityRedisKeys {

    public static final String AES_KEY_PREFIX = "auth:aeskey:";
    public static final String NONCE_PREFIX = "auth:nonce:";
    public static final String WS_TICKET_PREFIX = "auth:ws-ticket:";
    public static final String DEVICE_PREFIX = "auth:device:";
    public static final String CRYPTO_MANIFEST_KEY = "crypto:manifest:current";
    /** 当前 bootstrap 元数据（与 Worker crypto-runtime.json 对齐） */
    public static final String CRYPTO_BOOTSTRAP_KEY = "crypto:bootstrap:current";
    /** 邮箱验证链接 HMAC 密钥（部署时 internal register 写入，持久化） */
    public static final String EMAIL_LINK_SECRET_KEY = "auth:email:link-secret:current";
    public static final String EMAIL_CODE_PREFIX = "auth:email:code:";
    public static final String EMAIL_COOLDOWN_PREFIX = "auth:email:cooldown:";
    public static final String EMAIL_DAILY_PREFIX = "auth:email:daily:";
    public static final String EMAIL_VERIFY_LINK_PREFIX = "auth:email:verify-link:";
    public static final String PASSWORD_RESET_LINK_PREFIX = "auth:password:reset-link:";
    public static final String CAPTCHA_CHALLENGE_PREFIX = "auth:captcha:challenge:";
    public static final String CAPTCHA_TOKEN_PREFIX = "auth:captcha:token:";
    public static final String RATE_LIMIT_PREFIX = "auth:ratelimit:";
    public static final String USER_ROLE_PREFIX = "user:role:";

    private SecurityRedisKeys() {
    }
}
