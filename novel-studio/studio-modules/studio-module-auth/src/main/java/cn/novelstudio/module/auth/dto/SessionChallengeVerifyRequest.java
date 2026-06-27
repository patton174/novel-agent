package cn.novelstudio.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SessionChallengeVerifyRequest {

    @NotBlank(message = "{validation.auth.turnstile_token_required}")
    private String turnstileToken;
}
