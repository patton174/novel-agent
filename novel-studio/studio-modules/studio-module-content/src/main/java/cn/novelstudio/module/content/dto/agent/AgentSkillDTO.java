package cn.novelstudio.module.content.dto.agent;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.List;
import java.util.UUID;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AgentSkillDTO(
    UUID id,
    String name,
    String description,
    String locale,
    boolean isSystem,
    List<String> tools,
    int version,
    String content
) {}
