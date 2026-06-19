package cn.novelstudio.module.agent.service;

import cn.novelstudio.module.agent.dto.agent.AgentRunContextDto;
import cn.novelstudio.module.content.dto.agent.AgentCheckpointDTO;
import cn.novelstudio.module.content.dto.agent.AgentRunDTO;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Rebuild worker/agent context from PG checkpoint blob after owner Java loss.
 */
@Component
public class RunColdFailoverContextBuilder {

    private final ObjectMapper objectMapper;

    public RunColdFailoverContextBuilder(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public AgentRunContextDto fromCheckpoint(AgentRunDTO run, AgentCheckpointDTO checkpoint) {
        if (checkpoint == null || checkpoint.getTranscriptRef() == null || checkpoint.getTranscriptRef().isBlank()) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(checkpoint.getTranscriptRef());
            JsonNode ctx = root.path("context");
            if (ctx.isMissingNode() || ctx.isNull()) {
                return null;
            }
            String runId = text(ctx, "run_id", run == null ? "" : run.getId());
            String sessionId = text(ctx, "session_id", run == null ? "" : run.getSessionId());
            Long userId = longVal(ctx, "user_id", run == null ? null : run.getUserId());
            String mode = text(ctx, "mode", run == null ? "auto" : run.getMode());
            String messageId = text(ctx, "message_id", "");
            String userMessage = text(ctx, "user_message", "");
            String chapterText = text(ctx, "chapter_text", "");
            List<Map<String, String>> history = readHistory(ctx.path("history"));
            Map<String, Object> preferences = readMap(ctx.path("preferences"));
            Map<String, Object> project = readMap(ctx.path("project"));
            List<Map<String, Object>> chapters = readChapterList(ctx.path("chapters"));
            String currentChapterId = text(ctx, "current_chapter_id", "");
            String novelId = text(ctx, "novel_id", "");
            int stepIndex = ctx.path("step_index").asInt(checkpoint.getStepIndex());
            String lastTool = text(ctx, "last_tool", checkpoint.getLastAction());
            String lastReason = text(ctx, "last_reason", "");
            Map<String, Object> contextPatch = mergeContextPatch(ctx.path("context_patch"), checkpoint);
            Map<String, Object> selectedChoice = readMap(ctx.path("selected_choice"));

            return new AgentRunContextDto(
                runId,
                sessionId,
                messageId,
                userId,
                mode,
                userMessage,
                chapterText,
                history,
                preferences,
                project,
                chapters,
                currentChapterId,
                novelId,
                stepIndex,
                lastTool,
                lastReason,
                contextPatch,
                selectedChoice
            );
        } catch (Exception ignored) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> assembledContextFromCheckpoint(AgentCheckpointDTO checkpoint) {
        if (checkpoint == null || checkpoint.getTranscriptRef() == null || checkpoint.getTranscriptRef().isBlank()) {
            return Map.of();
        }
        try {
            JsonNode ctx = objectMapper.readTree(checkpoint.getTranscriptRef()).path("context");
            if (ctx.isMissingNode() || ctx.isNull()) {
                return Map.of();
            }
            return objectMapper.convertValue(ctx, new TypeReference<>() {});
        } catch (Exception ignored) {
            return Map.of();
        }
    }

    private Map<String, Object> mergeContextPatch(JsonNode fromCtx, AgentCheckpointDTO checkpoint) {
        Map<String, Object> patch = readMap(fromCtx);
        if (checkpoint.getContextPatchJson() == null || checkpoint.getContextPatchJson().isBlank()) {
            return patch;
        }
        try {
            Map<String, Object> fromPg = objectMapper.readValue(
                checkpoint.getContextPatchJson(),
                new TypeReference<>() {}
            );
            fromPg.putAll(patch);
            return fromPg;
        } catch (Exception ignored) {
            return patch;
        }
    }

    private List<Map<String, String>> readHistory(JsonNode node) {
        if (node == null || !node.isArray()) {
            return List.of();
        }
        try {
            return objectMapper.convertValue(node, new TypeReference<>() {});
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private List<Map<String, Object>> readChapterList(JsonNode node) {
        if (node == null || !node.isArray()) {
            return List.of();
        }
        try {
            return objectMapper.convertValue(node, new TypeReference<>() {});
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private Map<String, Object> readMap(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return Map.of();
        }
        try {
            return objectMapper.convertValue(node, new TypeReference<>() {});
        } catch (Exception ignored) {
            return Map.of();
        }
    }

    private static String text(JsonNode node, String field, String fallback) {
        String value = node.path(field).asText("");
        return value.isBlank() ? (fallback == null ? "" : fallback) : value;
    }

    private static Long longVal(JsonNode node, String field, Long fallback) {
        JsonNode raw = node.get(field);
        if (raw == null || raw.isNull()) {
            return fallback;
        }
        if (raw.isNumber()) {
            return raw.longValue();
        }
        try {
            return Long.parseLong(raw.asText("").trim());
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }
}
