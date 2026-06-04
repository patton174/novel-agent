package com.novel.agent.content.dto;

import jakarta.validation.constraints.NotBlank;

public record ClearStoryMemoryRequest(
    @NotBlank String scope
) {}
