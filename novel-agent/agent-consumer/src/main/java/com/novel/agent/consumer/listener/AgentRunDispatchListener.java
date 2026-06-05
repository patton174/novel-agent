package com.novel.agent.consumer.listener;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.novel.agent.common.mq.agent.AgentRunDispatchMessage;
import com.novel.agent.common.mq.constant.MqTopic;
import com.novel.agent.common.mq.producer.IMessageProducer;
import com.novel.agent.consumer.support.ContentRestSupport;
import com.novel.agent.consumer.support.MqListenerSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.UUID;

@Component
public class AgentRunDispatchListener {

    private static final Logger log = LoggerFactory.getLogger(AgentRunDispatchListener.class);
    private static final String WORKER_CTX_PREFIX = "run:worker:ctx:";

    private final ObjectMapper objectMapper;
    private final ContentRestSupport contentRestSupport;
    private final RestClient pythonRestClient;
    private final StringRedisTemplate redisTemplate;
    private final String internalServiceKey;
    private final IMessageProducer messageProducer;

    public AgentRunDispatchListener(
        ObjectMapper objectMapper,
        ContentRestSupport contentRestSupport,
        @Qualifier("pythonRestClient") RestClient pythonRestClient,
        StringRedisTemplate redisTemplate,
        IMessageProducer messageProducer,
        @Value("${agent.internal.service-key:dev-internal-key-change-me}") String internalServiceKey
    ) {
        this.objectMapper = objectMapper;
        this.contentRestSupport = contentRestSupport;
        this.pythonRestClient = pythonRestClient;
        this.redisTemplate = redisTemplate;
        this.messageProducer = messageProducer;
        this.internalServiceKey = internalServiceKey;
    }

    @RabbitListener(queuesToDeclare = @Queue(name = "agent.run.dispatch.queue", durable = "true"))
    public void onDispatch(String message) {
        MqListenerSupport.safeHandle(log, message, "run.dispatch failed", this::handle);
    }

    private void handle(String message) throws Exception {
        AgentRunDispatchMessage payload = objectMapper.readValue(message, AgentRunDispatchMessage.class);
        log.info(
            "run.dispatch received runId={} action={} jobId={} attempt={}",
            payload.runId(),
            payload.action(),
            payload.jobId(),
            payload.attempt()
        );
        executeWorker(payload);
    }

    private void executeWorker(AgentRunDispatchMessage payload) throws Exception {
        String runId = payload.runId();
        if (runId == null || runId.isBlank()) {
            return;
        }
        String contextJson = redisTemplate.opsForValue().get(WORKER_CTX_PREFIX + runId);
        if (contextJson == null || contextJson.isBlank()) {
            log.warn("worker context missing runId={}", runId);
            return;
        }

        ObjectNode body = objectMapper.createObjectNode();
        body.put("run_id", runId);
        body.put("action", payload.action() == null ? "start" : payload.action());
        body.put("worker_id", "consumer-dispatch");
        if (payload.commandId() != null) {
            body.put("command_id", payload.commandId());
        }
        try {
            body.set("context", objectMapper.readTree(contextJson));
        } catch (Exception ex) {
            log.warn("invalid worker context runId={}: {}", runId, ex.getMessage());
            return;
        }

        if ("resume".equalsIgnoreCase(payload.action())) {
            JsonNode interaction = loadCommandPayload(runId, payload.commandId());
            if (interaction == null) {
                log.warn("resume command missing runId={} commandId={}", runId, payload.commandId());
                return;
            }
            body.set("resume_interaction", interaction);
        }

        Map<?, ?> response = pythonRestClient.post()
            .uri("/internal/worker/run/execute")
            .contentType(MediaType.APPLICATION_JSON)
            .header(ContentRestSupport.INTERNAL_KEY_HEADER, internalServiceKey)
            .body(body)
            .retrieve()
            .body(Map.class);

        if (response == null) {
            return;
        }
        Object status = response.get("status");
        log.info("worker execute done runId={} status={}", runId, status);
        if ("running".equals(String.valueOf(status))) {
            republishDispatch(runId, payload.action(), payload.commandId(), payload.attempt() + 1);
        }
    }

    private JsonNode loadCommandPayload(String runId, String commandId) throws Exception {
        if (commandId == null || commandId.isBlank()) {
            return null;
        }
        for (int attempt = 0; attempt < 8; attempt++) {
            JsonNode payload = fetchCommandPayload(runId, commandId);
            if (payload != null) {
                return payload;
            }
            try {
                Thread.sleep(150L);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                return null;
            }
        }
        return null;
    }

    private JsonNode fetchCommandPayload(String runId, String commandId) throws Exception {
        try {
            Map<?, ?> cmd = contentRestSupport.getInternal(
                "/internal/agent/runs/{runId}/commands/{commandId}",
                Map.class,
                runId,
                commandId
            );
            if (cmd == null) {
                return null;
            }
            Object payloadJson = cmd.get("payloadJson");
            if (payloadJson == null) {
                payloadJson = cmd.get("payload_json");
            }
            if (payloadJson == null) {
                return null;
            }
            return objectMapper.readTree(String.valueOf(payloadJson));
        } catch (Exception ex) {
            log.debug("load command attempt failed runId={} commandId={}: {}", runId, commandId, ex.getMessage());
            return null;
        }
    }

    private void republishDispatch(String runId, String action, String commandId, int attempt) {
        AgentRunDispatchMessage next = new AgentRunDispatchMessage(
            "job_" + UUID.randomUUID(),
            runId,
            action,
            commandId,
            null,
            attempt
        );
        messageProducer.send(MqTopic.AGENT_RUN_DISPATCH, next);
    }
}
