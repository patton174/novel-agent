package com.novel.agent.auth.dto;

import com.novel.agent.common.security.SessionCryptoMaterial;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponse {
    /** Access JWT（前端内存保存，并逐步淘汰 localStorage） */
    private String token;
    private Long userId;
    private String username;
    private String role;
    private Long expiresIn;
    private SessionCryptoMaterial sessionCrypto;
    private Integer heartbeatIntervalSec;
    /** 设备会话 ID，心跳与 Gateway 校验用 */
    private String sessionId;
}
