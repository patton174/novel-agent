package cn.novelstudio.module.content.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.Map;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record UpdateMemoryNodeRequest(
    String title,
    String nodeKind,
    String content,
    Map<String, Object> style,
    Map<String, Object> meta
) {}
