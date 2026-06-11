package cn.novelstudio.module.agent.ws;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.module.agent.orchestration.AgentRunCoordinator;
import cn.novelstudio.module.agent.orchestration.AgentRunRegistry;
import cn.novelstudio.module.agent.config.AgentRuntimeProperties;
import cn.novelstudio.module.agent.service.PgRunInteractionService;
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
    private final AgentRuntimeProperties runtimeProperties;
    private final PgRunInteractionService pgRunInteractionService;

    public AgentRunWebSocketHandler(
        AgentRunRegistry runRegistry,
        ObjectMapper objectMapper,
        AgentRuntimeProperties runtimeProperties,
        PgRunInteractionService pgRunInteractionService
    ) {
        this.runRegistry = runRegistry;
        this.objectMapper = objectMapper;
        this.runtimeProperties = runtimeProperties;
        this.pgRunInteractionService = pgRunInteractionService;
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
            switch (type) {
                case "interaction.submit" -> {
                    Map<String, Object> payload = objectMapper.convertValue(
                        root.path("payload"),
                        objectMapper.getTypeFactory().constructMapType(HashMap.class, String.class, Object.class)
                    );
                    if (coordinator != null) {
                        coordinator.submitInteraction(payload);
                    } else if (runtimeProperties.isPgRunEnabled()) {
                        pgRunInteractionService.submitInteraction(runId, payload);
                    } else {
                        log.warn("no active run for ws message runId={}", runId);
                    }
                }
                case "run.pause" -> {
                    if (coordinator != null) {
                        coordinator.pause();
                    }
                }
                case "run.resume" -> {
                    if (coordinator != null) {
                        coordinator.resume();
                    }
                }
                case "run.abort" -> {
                    if (coordinator != null) {
                        coordinator.abort();
                    }
                }
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
