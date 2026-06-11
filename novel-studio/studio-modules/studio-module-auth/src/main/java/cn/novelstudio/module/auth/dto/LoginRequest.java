package cn.novelstudio.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Map;

@Data
public class LoginRequest {

    @NotBlank(message = "用户名不能为空")
    private String username;

    @NotBlank(message = "密码不能为空")
    private String password;

    /** 浏览器指纹 SHA-256（Phase 0b） */
    private String fingerprint;

    /** 登录时全量环境快照 */
    private Map<String, Object> envSnapshot;
}