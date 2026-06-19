package com.novel.agent.common.security;

import java.util.Map;

/**
 * 客户端 AES 请求 Envelope（Gateway 解密用）。
 */
public record RequestCryptoEnvelope(
    int v,
    String kid,
    Long ts,
    String nonce,
    String iv,
    String ct,
    Map<String, Object> fields,
    String sign
) {
    public boolean looksEncrypted() {
        return kid != null && !kid.isBlank() && iv != null && !iv.isBlank() && ct != null && !ct.isBlank();
    }
}
