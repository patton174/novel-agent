package com.novel.agent.content.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record PersistStoryMemoryRequest(
    @NotNull Map<String, Object> memory
) {
}
