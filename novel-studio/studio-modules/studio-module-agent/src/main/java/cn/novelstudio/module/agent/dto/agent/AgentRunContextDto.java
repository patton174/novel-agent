package cn.novelstudio.module.agent.dto.agent;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.List;
import java.util.Map;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AgentRunContextDto(
    String runId,
    String sessionId,
    String messageId,
    Long userId,
    String mode,
    String userMessage,
    String chapterText,
    List<Map<String, String>> history,
    Map<String, Object> preferences,
    Map<String, Object> project,
    List<Map<String, Object>> chapters,
    String currentChapterId,
    String novelId,
    int stepIndex,
    String lastTool,
    String lastReason,
    Map<String, Object> contextPatch,
    Map<String, Object> selectedChoice,
    List<Map<String, Object>> referencedBooks,
    List<Map<String, Object>> skillIds,
    String skillPrompt,
    Map<String, Object> modelConfig,
    String defaultProfileId,
    String crewId,
    Map<String, Object> crewVars,
    List<Map<String, Object>> crewTemplate
) {}
