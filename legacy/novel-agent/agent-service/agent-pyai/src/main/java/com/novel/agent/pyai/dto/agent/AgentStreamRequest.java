package com.novel.agent.pyai.dto.agent;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AgentStreamRequest(
    @NotBlank String message,
    String mode,
    Boolean hostMode,
    String contextText,
    String sessionId,
    String novelId,
    String chapterId,
    List<HistoryTurn> history
) {
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record HistoryTurn(String role, String content) {}
}
