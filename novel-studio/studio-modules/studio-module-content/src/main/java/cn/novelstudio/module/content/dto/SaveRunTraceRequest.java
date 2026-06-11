package cn.novelstudio.module.content.dto;

import jakarta.validation.constraints.NotBlank;

public record SaveRunTraceRequest(
    @NotBlank String runId,
    String traceJson
) {}
