package cn.novelstudio.module.agent.ws;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.module.agent.config.AgentRuntimeProperties;
import cn.novelstudio.module.agent.orchestration.AgentRunCoordinator;
import cn.novelstudio.module.agent.orchestration.AgentRunRegistry;
import cn.novelstudio.module.agent.service.PgRunInteractionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class AgentRunWsInboundService {

    private static final Logger log = LoggerFactory.getLogger(AgentRunWsInboundService.class);

    private final AgentRunRegistry runRegistry;
    private final ObjectMapper objectMapper;
    private final AgentRuntimeProperties runtimeProperties;
    private final PgRunInteractionService pgRunInteractionService;

    public AgentRunWsInboundService(
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

    public void handleInbound(String runId, String text) {
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
}
