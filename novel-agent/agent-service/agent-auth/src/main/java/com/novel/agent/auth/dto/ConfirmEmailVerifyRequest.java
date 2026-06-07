package com.novel.agent.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ConfirmEmailVerifyRequest {

    @NotBlank
    private String token;

    @NotBlank
    private String sig;

    @NotNull
    private Long exp;
}
