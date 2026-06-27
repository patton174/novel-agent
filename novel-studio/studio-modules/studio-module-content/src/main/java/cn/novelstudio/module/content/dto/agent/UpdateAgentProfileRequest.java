package cn.novelstudio.module.content.dto.agent;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpdateAgentProfileRequest(
    @NotBlank @Size(max = 128) String displayName,
    @Size(max = 512) String description,
    @NotBlank String systemPromptTemplate,
    List<String> toolAllowlist,
    String modelOverride,
    Integer maxTurns,
    Integer maxOutputTokens,
    List<String> skillIds
) {}
