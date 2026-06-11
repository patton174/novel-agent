package cn.novelstudio.module.agent.dto.agent;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.Map;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PythonAgentStepRequest(
    AgentRunContextDto context,
    String tool,
    Map<String, Object> toolInput
) {}
