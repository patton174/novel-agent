package cn.novelstudio.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ConfirmPasswordResetRequest {

    @NotBlank(message = "{validation.email_link.token_required}")
    private String token;

    @NotBlank(message = "{validation.email_link.sig_required}")
    private String sig;

    @NotNull(message = "{validation.email_link.exp_required}")
    private Long exp;

    @NotBlank(message = "{validation.password.new_required}")
    @Size(min = 6, max = 128, message = "{validation.password.size_range}")
    private String newPassword;
}
