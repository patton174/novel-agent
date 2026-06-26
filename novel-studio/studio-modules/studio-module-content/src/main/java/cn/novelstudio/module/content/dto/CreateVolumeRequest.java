package cn.novelstudio.module.content.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateVolumeRequest(
    @NotBlank(message = "{validation.content.title_required}") String title,
    String description,
    Integer sortOrder
) {}
