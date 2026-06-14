package cn.novelstudio.module.agent.ws;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class AgentRunServletWebSocketHandler extends TextWebSocketHandler {

    private final AgentRunWsInboundService inboundService;

    public AgentRunServletWebSocketHandler(AgentRunWsInboundService inboundService) {
        this.inboundService = inboundService;
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String runId = AgentStatusServletWebSocketHandler.queryParam(session.getUri(), "runId");
        if (runId == null || runId.isBlank()) {
            return;
        }
        inboundService.handleInbound(runId, message.getPayload());
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String runId = AgentStatusServletWebSocketHandler.queryParam(session.getUri(), "runId");
        if (runId == null || runId.isBlank()) {
            session.close(CloseStatus.BAD_DATA);
        }
    }
}
