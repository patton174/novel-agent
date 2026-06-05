package com.novel.agent.consumer.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.mq.agent.AgentRunEventMessage;
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
public class AgentRunEventsListener {

    private static final Logger log = LoggerFactory.getLogger(AgentRunEventsListener.class);

    private static final String INTERNAL_KEY_HEADER = "X-Internal-Service-Key";

    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final String internalServiceKey;

    public AgentRunEventsListener(
        ObjectMapper objectMapper,
        @Value("${agent.content.base-url:http://127.0.0.1:8091}") String contentBaseUrl,
        @Value("${agent.internal.service-key:dev-internal-key-change-me}") String internalServiceKey
    ) {
        this.objectMapper = objectMapper;
        this.internalServiceKey = internalServiceKey;
        this.restClient = RestClient.builder().baseUrl(contentBaseUrl).build();
    }

    @RabbitListener(queuesToDeclare = @Queue(name = "agent.run.events.queue", durable = "true"))
    public void onEvent(String message) {
        try {
            AgentRunEventMessage payload = objectMapper.readValue(message, AgentRunEventMessage.class);
            if (payload.runId() == null || payload.runId().isBlank()) {
                return;
            }
            restClient.post()
                .uri("/internal/agent/runs/{runId}/events", payload.runId())
                .contentType(MediaType.APPLICATION_JSON)
                .header(INTERNAL_KEY_HEADER, internalServiceKey)
                .body(Map.of(
                    "eventId", payload.eventId() == null ? "" : payload.eventId(),
                    "eventType", payload.eventType() == null ? "agent.event" : payload.eventType(),
                    "source", payload.source() == null ? "mq" : payload.source(),
                    "payloadJson", payload.payloadJson() == null ? "{}" : payload.payloadJson()
                ))
                .retrieve()
                .toBodilessEntity();
            log.debug("run event persisted runId={} type={}", payload.runId(), payload.eventType());
        } catch (Exception ex) {
            log.error("run.events persist failed: {}", message, ex);
        }
    }
}
