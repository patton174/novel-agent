package cn.novelstudio.module.content.dto;

import jakarta.validation.constraints.NotBlank;

public record UpsertSessionRequest(
    @NotBlank(message = "{validation.content.session_id_required}") String sessionId,
    @NotBlank(message = "{validation.content.session_title_required}") String title,
    String novelId
) {}
