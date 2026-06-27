package cn.novelstudio.module.agent.dto.agent;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.time.Instant;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record RunTreeNode(
    String runId,
    String profileId,
    String roleLabel,
    String status,
    Instant startedAt,
    Instant endedAt,
    List<RunTreeNode> children
) {}
