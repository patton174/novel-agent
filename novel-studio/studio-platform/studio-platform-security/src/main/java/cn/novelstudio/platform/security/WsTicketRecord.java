package cn.novelstudio.platform.security;

public record WsTicketRecord(
    Long userId,
    String sessionId,
    String purpose,
    String resourceId
) {
}
