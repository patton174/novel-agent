package com.novel.agent.consumer.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.mq.agent.AgentRunCommandMessage;
import com.novel.agent.consumer.support.ContentRestSupport;
import com.novel.agent.consumer.support.MqListenerSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class AgentRunCommandListener {

    private static final Logger log = LoggerFactory.getLogger(AgentRunCommandListener.class);

    private final ObjectMapper objectMapper;
    private final ContentRestSupport contentRestSupport;

    public AgentRunCommandListener(ObjectMapper objectMapper, ContentRestSupport contentRestSupport) {
        this.objectMapper = objectMapper;
        this.contentRestSupport = contentRestSupport;
    }

    @RabbitListener(queuesToDeclare = @Queue(name = "agent.run.command.queue", durable = "true"))
    public void onCommand(String message) {
        MqListenerSupport.safeHandle(log, message, "run.command persist failed", this::handle);
    }

    private void handle(String message) throws Exception {
        AgentRunCommandMessage payload = objectMapper.readValue(message, AgentRunCommandMessage.class);
        if (payload.runId() == null || payload.runId().isBlank()) {
            return;
        }
        contentRestSupport.postInternal(
            "/internal/agent/runs/{runId}/commands",
            Map.of(
                "commandId", payload.commandId() == null ? "" : payload.commandId(),
                "commandType", payload.commandType() == null ? "interaction.submit" : payload.commandType(),
                "payloadJson", payload.payloadJson() == null ? "{}" : payload.payloadJson()
            ),
            payload.runId()
        );
        log.info("run.command recorded runId={} commandId={}", payload.runId(), payload.commandId());
    }
}
