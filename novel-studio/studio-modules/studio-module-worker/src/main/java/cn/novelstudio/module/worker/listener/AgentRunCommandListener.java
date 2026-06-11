package cn.novelstudio.module.worker.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.platform.messaging.agent.AgentRunCommandMessage;
import cn.novelstudio.module.content.dto.agent.RecordAgentCommandRequest;
import cn.novelstudio.module.content.service.internal.InternalAgentRunBiz;
import cn.novelstudio.module.worker.support.MqListenerSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class AgentRunCommandListener {

    private static final Logger log = LoggerFactory.getLogger(AgentRunCommandListener.class);

    private final ObjectMapper objectMapper;
    private final InternalAgentRunBiz internalAgentRunBiz;

    public AgentRunCommandListener(ObjectMapper objectMapper, InternalAgentRunBiz internalAgentRunBiz) {
        this.objectMapper = objectMapper;
        this.internalAgentRunBiz = internalAgentRunBiz;
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
        RecordAgentCommandRequest request = new RecordAgentCommandRequest();
        request.setCommandId(payload.commandId() == null ? "" : payload.commandId());
        request.setCommandType(payload.commandType() == null ? "interaction.submit" : payload.commandType());
        request.setPayloadJson(payload.payloadJson() == null ? "{}" : payload.payloadJson());
        internalAgentRunBiz.recordCommand(payload.runId(), request);
        log.info("run.command recorded runId={} commandId={}", payload.runId(), payload.commandId());
    }
}
