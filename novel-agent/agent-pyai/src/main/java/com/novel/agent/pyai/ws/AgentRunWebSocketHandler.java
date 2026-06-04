package com.novel.agent.pyai.ws;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.pyai.orchestration.AgentRunCoordinator;
import com.novel.agent.pyai.orchestration.AgentRunRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.HashMap;
import java.util.Map;

@Component
public class AgentRunWebSocketHandler implements WebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(AgentRunWebSocketHandler.class);

    private final AgentRunRegistry runRegistry;
    private final ObjectMapper objectMapper;

    public AgentRunWebSocketHandler(AgentRunRegistry runRegistry, ObjectMapper objectMapper) {
        this.runRegistry = runRegistry;
        this.objectMapper = objectMapper;
    }

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        String runId = getQuery(session, "runId");
        if (runId == null || runId.isBlank()) {
            return session.close();
        }
        return session.receive()
            .map(WebSocketMessage::getPayloadAsText)
            .doOnNext(text -> Schedulers.boundedElastic().schedule(() -> handleInbound(runId, text)))
            .then();
    }

    private void handleInbound(String runId, String text) {
        if (text == null || text.isBlank()) {
            return;
        }
        try {
            JsonNode root = objectMapper.readTree(text);
            String type = root.path("type").asText("");
            AgentRunCoordinator coordinator = runRegistry.get(runId);
            if (coordinator == null) {
                log.warn("no active run for ws message runId={}", runId);
                return;
            }
            switch (type) {
                case "interaction.submit" -> {
                    Map<String, Object> payload = objectMapper.convertValue(
                        root.path("payload"),
                        objectMapper.getTypeFactory().constructMapType(HashMap.class, String.class, Object.class)
                    );
                    coordinator.submitInteraction(payload);
                }
                case "run.pause" -> coordinator.pause();
                case "run.resume" -> coordinator.resume();
                case "run.abort" -> coordinator.abort();
                default -> log.debug("ignored ws type={} runId={}", type, runId);
            }
        } catch (Exception ex) {
            log.warn("ws inbound parse failed runId={}: {}", runId, ex.getMessage());
        }
    }

    private String getQuery(WebSocketSession session, String key) {
        String query = session.getHandshakeInfo().getUri().getQuery();
        if (query == null || !query.contains(key + "=")) {
            return null;
        }
        for (String part : query.split("&")) {
            if (part.startsWith(key + "=")) {
                return part.substring(key.length() + 1);
            }
        }
        return null;
    }
}
