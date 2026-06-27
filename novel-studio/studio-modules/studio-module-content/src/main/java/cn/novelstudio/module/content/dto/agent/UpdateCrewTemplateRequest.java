package cn.novelstudio.module.content.dto.agent;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpdateCrewTemplateRequest(
    @NotBlank @Size(max = 128) String displayName,
    @Size(max = 2048) String description,
    @NotEmpty List<CrewStageDef> stages
) {}
