package cn.novelstudio.module.content.dto;

public record ContentMessageDTO(
    String id,
    String sessionId,
    String role,
    String content,
    String runId,
    String messageId,
    String mode,
    long createdAt,
    /** JSON: thinkText, stepStates, timeline, todos */
    String agentTraceJson
) {
    public ContentMessageDTO(
        String id,
        String sessionId,
        String role,
        String content,
        String runId,
        String messageId,
        String mode,
        long createdAt
    ) {
        this(id, sessionId, role, content, runId, messageId, mode, createdAt, null);
    }
}
