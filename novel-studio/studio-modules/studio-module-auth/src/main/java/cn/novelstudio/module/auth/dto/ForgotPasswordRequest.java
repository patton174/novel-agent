package cn.novelstudio.module.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForgotPasswordRequest {

    @NotBlank
    @Email
    private String email;

    @NotBlank(message = "请先完成滑块验证")
    private String captchaToken;
}
