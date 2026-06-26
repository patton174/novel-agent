package cn.novelstudio.module.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TurnstileVerifyRequest {

    @NotBlank(message = "{validation.auth.email_field_required}")
    @Email(message = "{validation.auth.email_invalid}")
    private String email;

    @NotBlank(message = "{validation.auth.turnstile_token_required}")
    private String turnstileToken;

    /** Honeypot：正常客户端留空。 */
    private String website;
}
