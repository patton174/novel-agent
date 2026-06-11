package cn.novelstudio.module.content.dto.agent;

public record AgentRunContextRequest(
    Long userId,
    String novelId,
    String chapterId,
    String sessionId
) {}
