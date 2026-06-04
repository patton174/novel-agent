package com.novel.agent.content.dto;

import jakarta.validation.constraints.NotBlank;

public record SaveRunTraceRequest(
    @NotBlank String runId,
    String traceJson
) {}
