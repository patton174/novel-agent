package cn.novelstudio.module.agent.dto.agent;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.List;
import java.util.Map;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ResolveAgentSkillsResponse(
    List<Map<String, Object>> skills,
    String mergedPrompt
) {}
