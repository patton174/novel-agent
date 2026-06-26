package cn.novelstudio.module.content.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record BatchDeleteSessionsRequest(
    @NotEmpty(message = "{validation.content.session_ids_required}") List<String> sessionIds
) {}
