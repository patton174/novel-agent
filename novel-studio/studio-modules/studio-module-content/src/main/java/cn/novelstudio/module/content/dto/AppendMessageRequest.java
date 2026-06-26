package cn.novelstudio.module.content.dto;

import jakarta.validation.constraints.NotBlank;

public record AppendMessageRequest(
    @NotBlank(message = "{validation.content.session_id_required}") String sessionId,
    @NotBlank(message = "{validation.content.role_required}") String role,
    @NotBlank(message = "{validation.content.content_required}") String content,
    String runId,
    String messageId,
    String mode
) {}
