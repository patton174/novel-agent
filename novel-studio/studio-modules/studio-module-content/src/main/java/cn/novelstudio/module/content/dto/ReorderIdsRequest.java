package cn.novelstudio.module.content.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record ReorderIdsRequest(
    @NotEmpty(message = "{validation.content.ids_required}") List<String> ids
) {}
