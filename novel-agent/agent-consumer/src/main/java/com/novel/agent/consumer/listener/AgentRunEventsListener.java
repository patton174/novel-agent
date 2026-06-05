package com.novel.agent.consumer.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.mq.agent.AgentRunEventMessage;
import com.novel.agent.consumer.support.ContentRestSupport;
import com.novel.agent.consumer.support.MqListenerSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class AgentRunEventsListener {

    private static final Logger log = LoggerFactory.getLogger(AgentRunEventsListener.class);

    private final ObjectMapper objectMapper;
    private final ContentRestSupport contentRestSupport;

    public AgentRunEventsListener(ObjectMapper objectMapper, ContentRestSupport contentRestSupport) {
        this.objectMapper = objectMapper;
        this.contentRestSupport = contentRestSupport;
    }

    @RabbitListener(queuesToDeclare = @Queue(name = "agent.run.events.queue", durable = "true"))
    public void onEvent(String message) {
        MqListenerSupport.safeHandle(log, message, "run.events persist failed", this::handle);
    }

    private void handle(String message) throws Exception {
        AgentRunEventMessage payload = objectMapper.readValue(message, AgentRunEventMessage.class);
        if (payload.runId() == null || payload.runId().isBlank()) {
            return;
        }
        contentRestSupport.postInternal(
            "/internal/agent/runs/{runId}/events",
            Map.of(
                "eventId", payload.eventId() == null ? "" : payload.eventId(),
                "eventType", payload.eventType() == null ? "agent.event" : payload.eventType(),
                "source", payload.source() == null ? "mq" : payload.source(),
                "payloadJson", payload.payloadJson() == null ? "{}" : payload.payloadJson()
            ),
            payload.runId()
        );
        log.debug("run event persisted runId={} type={}", payload.runId(), payload.eventType());
    }
}
