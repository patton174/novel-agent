package cn.novelstudio.module.agent.ws;

import cn.novelstudio.module.agent.service.AgentStatusHub;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import reactor.core.Disposable;
import reactor.core.scheduler.Schedulers;

import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AgentStatusServletWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(AgentStatusServletWebSocketHandler.class);

    private final AgentStatusHub statusHub;
    private final Map<String, Disposable> subscriptions = new ConcurrentHashMap<>();

    public AgentStatusServletWebSocketHandler(AgentStatusHub statusHub) {
        this.statusHub = statusHub;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String userIdRaw = queryParam(session.getUri(), "userId");
        String sessionId = queryParam(session.getUri(), "sessionId");
        if (userIdRaw == null || userIdRaw.isBlank() || sessionId == null || sessionId.isBlank()) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }
        final Long userId;
        try {
            userId = Long.parseLong(userIdRaw);
        } catch (NumberFormatException ex) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }
        Disposable sub = statusHub.subscribe(userId, sessionId)
            .publishOn(Schedulers.boundedElastic())
            .subscribe(
                payload -> sendText(session, payload),
                error -> log.warn("status ws stream error sessionId={}: {}", sessionId, error.getMessage()),
                () -> { }
            );
        subscriptions.put(session.getId(), sub);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Disposable sub = subscriptions.remove(session.getId());
        if (sub != null && !sub.isDisposed()) {
            sub.dispose();
        }
    }

    private static void sendText(WebSocketSession session, String payload) {
        if (!session.isOpen() || payload == null) {
            return;
        }
        try {
            synchronized (session) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(payload));
                }
            }
        } catch (IOException ex) {
            log.debug("status ws send failed: {}", ex.getMessage());
        }
    }

    static String queryParam(URI uri, String key) {
        if (uri == null || uri.getQuery() == null) {
            return null;
        }
        for (String part : uri.getQuery().split("&")) {
            if (part.startsWith(key + "=")) {
                return part.substring(key.length() + 1);
            }
        }
        return null;
    }
}
