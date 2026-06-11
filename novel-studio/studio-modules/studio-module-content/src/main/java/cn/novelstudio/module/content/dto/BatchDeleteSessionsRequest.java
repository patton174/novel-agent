package cn.novelstudio.module.content.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record BatchDeleteSessionsRequest(
    @NotEmpty List<String> sessionIds
) {}
