package cn.novelstudio.module.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "{validation.auth.username_required}")
    @Size(min = 3, max = 20, message = "{validation.auth.username_size}")
    private String username;

    @NotBlank(message = "{validation.auth.password_required}")
    @Size(min = 6, max = 50, message = "{validation.auth.password_size}")
    private String password;

    @NotBlank(message = "{validation.auth.email_required}")
    @Email(message = "{validation.auth.email_invalid}")
    private String email;

    /** Six-digit code; required only when registration.require_email_verify is enabled. */
    @Size(min = 6, max = 6, message = "{validation.auth.email_code_size}")
    private String emailCode;

    /** Optional invite code (NA-INV-XXXX). */
    @Size(max = 32, message = "{validation.auth.invite_code_size}")
    private String inviteCode;
}
