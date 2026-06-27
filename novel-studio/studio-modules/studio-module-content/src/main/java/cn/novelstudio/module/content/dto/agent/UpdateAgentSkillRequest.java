package cn.novelstudio.module.content.dto.agent;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record UpdateAgentSkillRequest(
    int version,
    String description,
    String content,
    List<String> tools,
    String locale
) {}
