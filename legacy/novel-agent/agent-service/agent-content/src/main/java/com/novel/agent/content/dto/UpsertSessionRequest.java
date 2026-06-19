package com.novel.agent.content.dto;

import jakarta.validation.constraints.NotBlank;

public record UpsertSessionRequest(
    @NotBlank String sessionId,
    @NotBlank String title,
    String novelId
) {}
