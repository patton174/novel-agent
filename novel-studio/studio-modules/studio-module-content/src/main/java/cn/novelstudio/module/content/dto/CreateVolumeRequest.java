package cn.novelstudio.module.content.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateVolumeRequest(
    @NotBlank String title,
    String description,
    Integer sortOrder
) {}
