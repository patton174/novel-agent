package com.novel.agent.common.security;

public record WsTicketRecord(
    Long userId,
    String sessionId,
    String purpose,
    String resourceId
) {
}
