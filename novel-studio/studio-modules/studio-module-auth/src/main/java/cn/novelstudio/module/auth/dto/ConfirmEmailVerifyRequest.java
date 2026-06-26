package cn.novelstudio.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ConfirmEmailVerifyRequest {

    @NotBlank(message = "{validation.email_link.token_required}")
    private String token;

    @NotBlank(message = "{validation.email_link.sig_required}")
    private String sig;

    @NotNull(message = "{validation.email_link.exp_required}")
    private Long exp;
}
