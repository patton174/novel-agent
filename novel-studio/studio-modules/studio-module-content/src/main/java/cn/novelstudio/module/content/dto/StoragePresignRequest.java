package cn.novelstudio.module.content.dto;

import jakarta.validation.constraints.NotBlank;

public record StoragePresignRequest(@NotBlank(message = "{storage.key.required}") String key) {}
