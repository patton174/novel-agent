package cn.novelstudio.module.agent.dto.agent;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.List;
import java.util.Map;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PythonAgentRequest(
    String runId,
    String sessionId,
    String messageId,
    UserContext user,
    InputPayload input,
    Map<String, Object> context,
    TraceOptions trace
) {
    public record UserContext(Long id, List<String> roles) {}

    public record InputPayload(String message, String mode) {}

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record TraceOptions(
        boolean emitThink,
        boolean emitTool,
        boolean emitSkill,
        boolean emitMcp,
        boolean forceThink,
        String thinkIntensity
    ) {
        public TraceOptions(boolean emitThink, boolean emitTool, boolean emitSkill, boolean emitMcp) {
            this(emitThink, emitTool, emitSkill, emitMcp, false, "medium");
        }
    }
}
