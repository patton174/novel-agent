package cn.novelstudio.module.agent.mq;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.platform.messaging.agent.AgentRunEventMessage;
import cn.novelstudio.platform.messaging.constant.MqTopic;
import cn.novelstudio.platform.messaging.producer.IMessageProducer;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class AgentRunMqPublisher {

    private final IMessageProducer messageProducer;
    private final ObjectMapper objectMapper;

    public AgentRunMqPublisher(IMessageProducer messageProducer, ObjectMapper objectMapper) {
        this.messageProducer = messageProducer;
        this.objectMapper = objectMapper;
    }

    public void publishAgentEvent(String runId, String sessionId, String payloadJson) {
        if (payloadJson == null || payloadJson.isBlank()) {
            return;
        }
        String eventType = "agent.event";
        try {
            JsonNode root = objectMapper.readTree(payloadJson);
            String type = root.path("type").asText("");
            if (!type.isBlank()) {
                eventType = type;
            }
        } catch (Exception ignored) {
            // keep default
        }
        AgentRunEventMessage message = new AgentRunEventMessage(
            "evt_" + UUID.randomUUID(),
            runId,
            sessionId,
            eventType,
            "pyai",
            payloadJson
        );
        messageProducer.send(MqTopic.AGENT_RUN_EVENTS, message);
    }
}
