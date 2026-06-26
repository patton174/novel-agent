package cn.novelstudio.module.content.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;

import java.util.Map;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record CreateMemoryNodeRequest(
    /** Optional for root nodes (derived from title); ignored for children (inherited from parent). */
    String scope,
    String parentId,
    Integer sortOrder,
    @NotBlank(message = "{validation.content.title_required}") String title,
    String nodeKind,
    String content,
    Map<String, Object> style,
    Map<String, Object> meta
) {}
