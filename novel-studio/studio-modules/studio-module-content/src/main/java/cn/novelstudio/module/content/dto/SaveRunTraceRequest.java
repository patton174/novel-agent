package cn.novelstudio.module.content.dto;

import jakarta.validation.constraints.NotBlank;

public record SaveRunTraceRequest(
    @NotBlank(message = "{validation.content.run_id_required}") String runId,
    String traceJson
) {}
