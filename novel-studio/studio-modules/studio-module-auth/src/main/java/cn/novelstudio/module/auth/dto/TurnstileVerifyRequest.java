package cn.novelstudio.module.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TurnstileVerifyRequest {

    @NotBlank(message = "email 不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;

    @NotBlank(message = "turnstileToken 不能为空")
    private String turnstileToken;

    /** Honeypot：正常客户端留空。 */
    private String website;
}
