package cn.novelstudio.module.content.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.Optional;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record MoveMemoryNodeRequest(
    /** Empty = do not reparent; explicit null in JSON = move to scope root. */
    Optional<String> parentId,
    Integer sortOrder
) {}
