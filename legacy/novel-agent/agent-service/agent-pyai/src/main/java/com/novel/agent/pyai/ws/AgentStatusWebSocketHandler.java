package com.novel.agent.pyai.ws;

import com.novel.agent.pyai.service.AgentStatusHub;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.CloseStatus;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Mono;

@Component
public class AgentStatusWebSocketHandler implements WebSocketHandler {
    private final AgentStatusHub statusHub;

    public AgentStatusWebSocketHandler(AgentStatusHub statusHub) {
        this.statusHub = statusHub;
    }

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        String userIdRaw = getQuery(session, "userId");
        String sessionId = getQuery(session, "sessionId");
        if (userIdRaw == null || userIdRaw.isBlank() || sessionId == null || sessionId.isBlank()) {
            return session.close(CloseStatus.BAD_DATA);
        }
        Long userId;
        try {
            userId = Long.parseLong(userIdRaw);
        } catch (NumberFormatException ex) {
            return session.close(CloseStatus.BAD_DATA);
        }
        return session.send(
            statusHub.subscribe(userId, sessionId)
                .map(session::textMessage)
        );
    }

    private String getQuery(WebSocketSession session, String key) {
        return session.getHandshakeInfo().getUri().getQuery() == null
            ? null
            : session.getHandshakeInfo().getUri().getQuery().contains(key + "=")
            ? session.getHandshakeInfo().getUri().getQuery().replaceAll(".*" + key + "=([^&]*).*", "$1")
            : null;
    }
}
