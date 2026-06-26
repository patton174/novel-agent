package cn.novelstudio.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Map;

@Data
public class LoginRequest {

    @NotBlank(message = "{validation.auth.username_required}")
    private String username;

    @NotBlank(message = "{validation.auth.password_required}")
    private String password;

    /** 浏览器指纹 SHA-256（Phase 0b） */
    private String fingerprint;

    /** 登录时全量环境快照 */
    private Map<String, Object> envSnapshot;
}
