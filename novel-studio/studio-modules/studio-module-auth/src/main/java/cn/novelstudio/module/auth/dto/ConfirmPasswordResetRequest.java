package cn.novelstudio.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ConfirmPasswordResetRequest {

    @NotBlank
    private String token;

    @NotBlank
    private String sig;

    @NotNull
    private Long exp;

    @NotBlank
    @Size(min = 6, max = 128)
    private String newPassword;
}
