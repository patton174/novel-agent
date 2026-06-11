package cn.novelstudio.module.content.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record PersistStoryMemoryScopePatchRequest(
    @NotBlank String scope,
    String itemId,
    @NotNull Map<String, Object> bucket
) {
}
