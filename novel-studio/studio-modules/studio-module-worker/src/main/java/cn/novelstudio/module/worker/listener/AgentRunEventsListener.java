package cn.novelstudio.module.worker.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.platform.messaging.agent.AgentRunEventMessage;
import cn.novelstudio.module.content.dto.agent.AppendAgentEventRequest;
import cn.novelstudio.module.content.service.internal.InternalAgentRunBiz;
import cn.novelstudio.module.worker.support.MqListenerSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class AgentRunEventsListener {

    private static final Logger log = LoggerFactory.getLogger(AgentRunEventsListener.class);

    private final ObjectMapper objectMapper;
    private final InternalAgentRunBiz internalAgentRunBiz;

    public AgentRunEventsListener(ObjectMapper objectMapper, InternalAgentRunBiz internalAgentRunBiz) {
        this.objectMapper = objectMapper;
        this.internalAgentRunBiz = internalAgentRunBiz;
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
        AppendAgentEventRequest request = new AppendAgentEventRequest();
        request.setEventId(payload.eventId() == null ? "" : payload.eventId());
        request.setEventType(payload.eventType() == null ? "agent.event" : payload.eventType());
        request.setSource(payload.source() == null ? "mq" : payload.source());
        request.setPayloadJson(payload.payloadJson() == null ? "{}" : payload.payloadJson());
        internalAgentRunBiz.appendEvent(payload.runId(), request);
        log.debug("run event persisted runId={} type={}", payload.runId(), payload.eventType());
    }
}
