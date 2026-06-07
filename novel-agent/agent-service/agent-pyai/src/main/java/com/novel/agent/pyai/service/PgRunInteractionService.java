package com.novel.agent.pyai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.pyai.client.ContentInternalClient;
import com.novel.agent.pyai.config.AgentRuntimeProperties;
import com.novel.agent.pyai.mq.AgentRunMqPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
public class PgRunInteractionService {

    private static final Logger log = LoggerFactory.getLogger(PgRunInteractionService.class);

    private final AgentRuntimeProperties runtimeProperties;
    private final AgentRunMqPublisher runMqPublisher;
    private final ObjectMapper objectMapper;
    private final ContentInternalClient contentInternalClient;

    public PgRunInteractionService(
        AgentRuntimeProperties runtimeProperties,
        AgentRunMqPublisher runMqPublisher,
        ObjectMapper objectMapper,
        ContentInternalClient contentInternalClient
    ) {
        this.runtimeProperties = runtimeProperties;
        this.runMqPublisher = runMqPublisher;
        this.objectMapper = objectMapper;
        this.contentInternalClient = contentInternalClient;
    }

    public void submitInteraction(String runId, Map<String, Object> payload) {
        if (!runtimeProperties.isPgRunEnabled()) {
            return;
        }
        String commandId = extractCommandId(payload);
        try {
            String payloadJson = objectMapper.writeValueAsString(payload);
            contentInternalClient.recordCommand(runId, commandId, "interaction.submit", payloadJson);
            runMqPublisher.publishCommand(runId, commandId, payloadJson);
            runMqPublisher.publishDispatchResume(runId, commandId);
            log.info("pg interaction queued runId={} commandId={}", runId, commandId);
        } catch (Exception ex) {
            log.warn("pg interaction publish failed runId={}: {}", runId, ex.getMessage());
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
