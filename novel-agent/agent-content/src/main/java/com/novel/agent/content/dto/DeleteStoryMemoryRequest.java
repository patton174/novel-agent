package com.novel.agent.content.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record DeleteStoryMemoryRequest(
    @NotBlank String scope,
    @NotBlank String key,
    String itemId
) {}
