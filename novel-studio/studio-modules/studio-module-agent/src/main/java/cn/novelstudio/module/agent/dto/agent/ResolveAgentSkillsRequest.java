package cn.novelstudio.module.agent.dto.agent;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ResolveAgentSkillsRequest(
    Long userId,
    List<String> skillIds
) {}
