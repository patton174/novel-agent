package cn.novelstudio.module.content.dto;

import jakarta.validation.constraints.NotBlank;

public record AppendMessageRequest(
    @NotBlank String sessionId,
    @NotBlank String role,
    @NotBlank String content,
    String runId,
    String messageId,
    String mode
) {}
