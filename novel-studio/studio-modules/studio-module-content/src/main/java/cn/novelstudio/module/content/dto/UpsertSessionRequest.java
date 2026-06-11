package cn.novelstudio.module.content.dto;

import jakarta.validation.constraints.NotBlank;

public record UpsertSessionRequest(
    @NotBlank String sessionId,
    @NotBlank String title,
    String novelId
) {}
