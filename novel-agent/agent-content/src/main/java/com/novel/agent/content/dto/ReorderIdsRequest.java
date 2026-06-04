package com.novel.agent.content.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record ReorderIdsRequest(
    @NotEmpty List<String> ids
) {}
