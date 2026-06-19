package cn.novelstudio.module.agent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.module.agent.client.ContentInternalClient;
import cn.novelstudio.module.agent.config.AgentRuntimeProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
public class PgRunInteractionService {

    private static final Logger log = LoggerFactory.getLogger(PgRunInteractionService.class);

    private final AgentRuntimeProperties runtimeProperties;
    private final PythonAgentRunClient runClient;
    private final ObjectMapper objectMapper;
    private final ContentInternalClient contentInternalClient;

    public PgRunInteractionService(
        AgentRuntimeProperties runtimeProperties,
        PythonAgentRunClient runClient,
        ObjectMapper objectMapper,
        ContentInternalClient contentInternalClient
    ) {
        this.runtimeProperties = runtimeProperties;
        this.runClient = runClient;
        this.objectMapper = objectMapper;
        this.contentInternalClient = contentInternalClient;
    }

    public void submitInteraction(String runId, Map<String, Object> payload) {
        String commandId = extractCommandId(payload);
        try {
            String payloadJson = objectMapper.writeValueAsString(payload);
            if (runtimeProperties.isPgRunEnabled()) {
                contentInternalClient.recordCommand(runId, commandId, "interaction.submit", payloadJson);
            }
            runClient.submitInteraction(runId, payload);
            log.info("interaction submitted runId={} commandId={}", runId, commandId);
        } catch (Exception ex) {
            log.warn("interaction submit failed runId={}: {}", runId, ex.getMessage());
        }
    }

    private static String extractCommandId(Map<String, Object> payload) {
        if (payload == null) {
            return "cmd_" + UUID.randomUUID();
        }
        Object raw = payload.get("command_id");
        if (raw == null) {
            raw = payload.get("commandId");
        }
        if (raw == null || String.valueOf(raw).isBlank()) {
            return "cmd_" + UUID.randomUUID();
        }
        return String.valueOf(raw);
    }
}
