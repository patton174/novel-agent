package cn.novelstudio.module.content.dto;

import jakarta.validation.constraints.NotBlank;

public record ClearStoryMemoryRequest(
    @NotBlank String scope
) {}
