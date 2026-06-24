package cn.novelstudio.module.agent.dto.agent;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AgentStreamRequest(
    String message,
    String mode,
    Boolean hostMode,
    String contextText,
    String sessionId,
    String novelId,
    String chapterId,
    List<HistoryTurn> history,
    /** 断线重连：指定 run；与空 message + sessionId 二选一 */
    String runId,
    /** 重连时仅回放 sequence 大于该值的事件，默认 -1 */
    Integer afterSequence,
    /** 临时模型覆盖：user_model id 或 pub:ai_model id */
    String modelOverride
) {
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record HistoryTurn(String role, String content) {}
}
