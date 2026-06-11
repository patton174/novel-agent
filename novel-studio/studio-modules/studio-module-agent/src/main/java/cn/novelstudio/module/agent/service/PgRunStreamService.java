package cn.novelstudio.module.agent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.platform.messaging.constant.MqTopic;
import cn.novelstudio.platform.messaging.producer.IMessageProducer;
import cn.novelstudio.module.agent.client.ContentInternalClient;
import cn.novelstudio.module.agent.dto.agent.AgentSessionPersistMessage;
import cn.novelstudio.module.agent.dto.agent.AgentStreamRequest;
import cn.novelstudio.module.agent.mq.AgentRunMqPublisher;
import cn.novelstudio.module.agent.dto.agent.AgentRunContextDto;
import cn.novelstudio.module.agent.orchestration.AgentRunState;
import cn.novelstudio.module.agent.orchestration.AssistantPersistCollector;
import cn.novelstudio.module.agent.orchestration.SseEventCodec;
import cn.novelstudio.module.agent.util.AgentTextSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Queued mode: assemble context → PG run + dispatch → SSE from Redis live fanout.
 */
@Service
public class PgRunStreamService {

    private static final Logger log = LoggerFactory.getLogger(PgRunStreamService.class);

    private final AgentContextAssembler contextAssembler;
    private final ContentInternalClient contentInternalClient;
    private final AgentRunMqPublisher runMqPublisher;
    private final RunLiveRedisSubscriber runLiveRedisSubscriber;
    private final RunWorkerContextStore workerContextStore;
    private final RunLiveSseFanout runLiveSseFanout;
    private final IMessageProducer messageProducer;
    private final SessionTitleService sessionTitleService;
    private final ObjectMapper objectMapper;

    public PgRunStreamService(
        AgentContextAssembler contextAssembler,
        ContentInternalClient contentInternalClient,
        AgentRunMqPublisher runMqPublisher,
        RunLiveRedisSubscriber runLiveRedisSubscriber,
        RunWorkerContextStore workerContextStore,
        RunLiveSseFanout runLiveSseFanout,
        IMessageProducer messageProducer,
        SessionTitleService sessionTitleService,
        ObjectMapper objectMapper
    ) {
        this.contextAssembler = contextAssembler;
        this.contentInternalClient = contentInternalClient;
        this.runMqPublisher = runMqPublisher;
        this.runLiveRedisSubscriber = runLiveRedisSubscriber;
        this.workerContextStore = workerContextStore;
        this.runLiveSseFanout = runLiveSseFanout;
        this.messageProducer = messageProducer;
        this.sessionTitleService = sessionTitleService;
        this.objectMapper = objectMapper;
    }

    public Flux<String> stream(Long userId, AgentStreamRequest request) {
        String mode = AgentContextAssembler.normalizeAgentMode(request.mode());
        String sessionId = request.sessionId();
        if (sessionId == null || sessionId.isBlank()) {
            sessionId = "session_" + UUID.randomUUID();
        }
        String runId = AgentRunState.newRunId();
        String messageId = AgentRunState.newMessageId();
        String finalSessionId = sessionId;
        AtomicBoolean persisted = new AtomicBoolean(false);
        AssistantPersistCollector assistantCollector = new AssistantPersistCollector();

        return Flux.<String>create(sink -> Schedulers.boundedElastic().schedule(() -> {
            AgentRunState state;
            try {
                Map<String, Object> context = contextAssembler.assemble(userId, finalSessionId, request);
                state = new AgentRunState(userId, finalSessionId, runId, messageId, request, context);
                workerContextStore.save(runId, state.toContextDto());
                contentInternalClient.createRun(
                    runId,
                    finalSessionId,
                    userId,
                    messageId + ":user",
                    messageId + ":assistant",
                    request.message(),
                    mode
                );
                runLiveRedisSubscriber.subscribe(userId, finalSessionId, runId);
                runLiveSseFanout.register(runId, frame -> {
                    sink.next(frame);
                    assistantCollector.onFrame(frame, objectMapper);
                    if (frame.startsWith("event: stream-end")) {
                        persistTurn(
                            persisted,
                            state,
                            runId,
                            mode,
                            sanitizeAssistantText(assistantCollector.buildSanitized()),
                            "completed",
                            null
                        );
                        sink.complete();
                    } else if (isFailedFrame(frame)) {
                        persistTurn(
                            persisted,
                            state,
                            runId,
                            mode,
                            sanitizeAssistantText(assistantCollector.buildSanitized()),
                            "failed",
                            extractError(frame)
                        );
                        sink.complete();
                    }
                });
                sink.onDispose(() -> {
                    runLiveSseFanout.unregister(runId);
                    runLiveRedisSubscriber.unsubscribe(runId);
                });
                sink.next(buildRunStarted(runId, finalSessionId, messageId));
                runMqPublisher.publishDispatchStart(runId);
            } catch (Exception ex) {
                log.error("queued stream bootstrap failed runId={}: {}", runId, ex.getMessage());
                sink.error(ex);
            }
        })).subscribeOn(Schedulers.boundedElastic());
    }

    private boolean isFailedFrame(String frame) {
        if (frame == null || !frame.contains("run.failed")) {
            return false;
        }
        String type = SseEventCodec.extractEventType(frame, objectMapper);
        return "run.failed".equals(type);
    }

    private String extractError(String frame) {
        try {
            JsonNode payload = SseEventCodec.extractPayload(frame, objectMapper);
            return payload.path("error").asText("run failed");
        } catch (Exception ex) {
            return "run failed";
        }
    }

    private String buildRunStarted(String runId, String sessionId, String messageId) {
        String json = String.format(
            "{\"event_id\":\"evt_%s\",\"type\":\"run.started\",\"run_id\":\"%s\",\"session_id\":\"%s\","
                + "\"message_id\":\"%s\",\"sequence\":1,\"payload\":{\"status\":\"started\"}}",
            UUID.randomUUID().toString().replace("-", "").substring(0, 8),
            runId,
            sessionId,
            messageId
        );
        return "event: agent-event\ndata: " + json + "\n\n";
    }

    private void persistTurn(
        AtomicBoolean persisted,
        AgentRunState state,
        String runId,
        String mode,
        String assistantMessage,
        String status,
        String error
    ) {
        if (!persisted.compareAndSet(false, true)) {
            return;
        }
        Map<String, Object> patch = Map.of();
        AgentRunContextDto workerCtx = workerContextStore.load(runId);
        if (workerCtx != null && workerCtx.contextPatch() != null) {
            patch = workerCtx.contextPatch();
        } else {
            patch = state.getMutableContextPatch();
        }
        AgentSessionPersistMessage message = new AgentSessionPersistMessage(
            state.getUserId(),
            state.getSessionId(),
            state.getRunId(),
            state.getMessageId(),
            mode,
            state.buildPersistedUserMessage(patch),
            assistantMessage,
            status,
            error
        );
        try {
            messageProducer.send(MqTopic.AGENT_SESSION, message);
            contentInternalClient.transitionRun(state.getRunId(), mapPgStatus(status), error);
        } catch (Exception ex) {
            log.warn("queued persist failed runId={}: {}", state.getRunId(), ex.getMessage());
        }
    }

    private static String mapPgStatus(String status) {
        if ("completed".equals(status)) {
            return "COMPLETED";
        }
        if ("failed".equals(status)) {
            return "FAILED";
        }
        return "FAILED";
    }

    private String sanitizeAssistantText(String raw) {
        String clean = AgentTextSanitizer.sanitizeAssistantVisibleText(raw);
        if (clean.isBlank()) {
            return "";
        }
        return clean;
    }
}
