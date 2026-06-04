package com.novel.agent.content.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PatchStoryMemoryRequest(
    @NotBlank String scope,
    @NotBlank String key,
    @NotBlank String value,
    String itemId
) {}
