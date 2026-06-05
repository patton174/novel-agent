package com.novel.agent.consumer.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.mq.agent.AgentRunCommandMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class AgentRunCommandListener {

    private static final Logger log = LoggerFactory.getLogger(AgentRunCommandListener.class);
    private static final String INTERNAL_KEY_HEADER = "X-Internal-Service-Key";

    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final String internalServiceKey;

    public AgentRunCommandListener(
        ObjectMapper objectMapper,
        @Value("${agent.content.base-url:http://127.0.0.1:8091}") String contentBaseUrl,
        @Value("${agent.internal.service-key:dev-internal-key-change-me}") String internalServiceKey
    ) {
        this.objectMapper = objectMapper;
        this.internalServiceKey = internalServiceKey;
        this.restClient = RestClient.builder().baseUrl(contentBaseUrl).build();
    }

    @RabbitListener(queuesToDeclare = @Queue(name = "agent.run.command.queue", durable = "true"))
    public void onCommand(String message) {
        try {
            AgentRunCommandMessage payload = objectMapper.readValue(message, AgentRunCommandMessage.class);
            if (payload.runId() == null || payload.runId().isBlank()) {
                return;
            }
            restClient.post()
                .uri("/internal/agent/runs/{runId}/commands", payload.runId())
                .contentType(MediaType.APPLICATION_JSON)
                .header(INTERNAL_KEY_HEADER, internalServiceKey)
                .body(Map.of(
                    "commandId", payload.commandId() == null ? "" : payload.commandId(),
                    "commandType", payload.commandType() == null ? "interaction.submit" : payload.commandType(),
                    "payloadJson", payload.payloadJson() == null ? "{}" : payload.payloadJson()
                ))
                .retrieve()
                .body(Map.class);
            log.info("run.command recorded runId={} commandId={}", payload.runId(), payload.commandId());
        } catch (Exception ex) {
            log.error("run.command persist failed: {}", message, ex);
        }
    }
}
