package com.novel.agent.pyai.client;

import com.novel.agent.pyai.config.AgentRuntimeProperties;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class ContentInternalClient {

    private static final String INTERNAL_KEY_HEADER = "X-Internal-Service-Key";

    private final RestClient restClient;
    private final AgentRuntimeProperties runtimeProperties;

    public ContentInternalClient(
        @Qualifier("contentRestClient") RestClient restClient,
        AgentRuntimeProperties runtimeProperties
    ) {
        this.restClient = restClient;
        this.runtimeProperties = runtimeProperties;
    }

    public void createRun(
        String runId,
        String sessionId,
        Long userId,
        String userMessageId,
        String assistantMessageId,
        String userMessageContent,
        String mode
    ) {
        restClient.post()
            .uri("/internal/agent/runs")
            .contentType(MediaType.APPLICATION_JSON)
            .header(INTERNAL_KEY_HEADER, runtimeProperties.internalServiceKey())
            .body(Map.of(
                "runId", runId,
                "sessionId", sessionId,
                "userId", userId,
                "userMessageId", userMessageId,
                "assistantMessageId", assistantMessageId,
                "userMessageContent", userMessageContent == null ? "" : userMessageContent,
                "mode", mode == null ? "auto" : mode
            ))
            .retrieve()
            .toBodilessEntity();
    }

    public void transitionRun(String runId, String status, String errorMessage) {
        restClient.post()
            .uri("/internal/agent/runs/{runId}/transition", runId)
            .contentType(MediaType.APPLICATION_JSON)
            .header(INTERNAL_KEY_HEADER, runtimeProperties.internalServiceKey())
            .body(Map.of(
                "status", status,
                "errorMessage", errorMessage == null ? "" : errorMessage
            ))
            .retrieve()
            .toBodilessEntity();
    }

    public void recordCommand(String runId, String commandId, String commandType, String payloadJson) {
        restClient.post()
            .uri("/internal/agent/runs/{runId}/commands", runId)
            .contentType(MediaType.APPLICATION_JSON)
            .header(INTERNAL_KEY_HEADER, runtimeProperties.internalServiceKey())
            .body(Map.of(
                "commandId", commandId,
                "commandType", commandType == null ? "interaction.submit" : commandType,
                "payloadJson", payloadJson == null ? "{}" : payloadJson
            ))
            .retrieve()
            .toBodilessEntity();
    }
}
