package cn.novelstudio.module.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForgotPasswordRequest {

    @NotBlank(message = "{validation.auth.email_required}")
    @Email(message = "{validation.auth.email_invalid}")
    private String email;

    @NotBlank(message = "{validation.auth.captcha_required}")
    private String captchaToken;
}
