package com.novel.agent.pyai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.mq.constant.MqTopic;
import com.novel.agent.common.mq.producer.IMessageProducer;
import com.novel.agent.pyai.dto.agent.AgentSessionPersistMessage;
import com.novel.agent.pyai.dto.agent.AgentStreamRequest;
import com.novel.agent.pyai.orchestration.AgentRunCoordinator;
import com.novel.agent.pyai.orchestration.AssistantPersistCollector;
import com.novel.agent.pyai.orchestration.AgentRunEventJournal;
import com.novel.agent.pyai.orchestration.AgentRunRegistry;
import com.novel.agent.pyai.orchestration.AgentRunState;
import com.novel.agent.pyai.client.ContentInternalClient;
import com.novel.agent.pyai.config.AgentRuntimeProperties;
import com.novel.agent.pyai.config.AgentSideEffectExecutorConfig;
import com.novel.agent.pyai.mq.AgentRunMqPublisher;
import com.novel.agent.pyai.orchestration.HostModeEventFanout;
import com.novel.agent.pyai.orchestration.PgRunEventFanout;
import com.novel.agent.pyai.orchestration.SseEventCodec;
import com.novel.agent.pyai.util.AgentTextSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class AgentBridgeService {

    private static final Logger log = LoggerFactory.getLogger(AgentBridgeService.class);

    private final PythonAgentRunClient runClient;
    private final AgentContextAssembler contextAssembler;
    private final ChapterSideEffectService chapterSideEffectService;
    private final IMessageProducer messageProducer;
    private final ObjectMapper objectMapper;
    private final AgentRunRegistry runRegistry;
    private final SessionTitleService sessionTitleService;
    private final AgentStatusHub statusHub;
    private final AgentRunEventJournal eventJournal;
    private final AgentRuntimeProperties runtimeProperties;
    private final ContentInternalClient contentInternalClient;
    private final AgentRunMqPublisher runMqPublisher;
    private final RunLiveRedisSubscriber runLiveRedisSubscriber;
    private final PgRunStreamService pgRunStreamService;
    private final RunWorkerContextStore workerContextStore;
    private final Executor sideEffectExecutor;

    public AgentBridgeService(
        PythonAgentRunClient runClient,
        AgentContextAssembler contextAssembler,
        ChapterSideEffectService chapterSideEffectService,
        IMessageProducer messageProducer,
        ObjectMapper objectMapper,
        AgentRunRegistry runRegistry,
        SessionTitleService sessionTitleService,
        AgentStatusHub statusHub,
        AgentRunEventJournal eventJournal,
        AgentRuntimeProperties runtimeProperties,
        ContentInternalClient contentInternalClient,
        AgentRunMqPublisher runMqPublisher,
        RunLiveRedisSubscriber runLiveRedisSubscriber,
        PgRunStreamService pgRunStreamService,
        RunWorkerContextStore workerContextStore,
        @org.springframework.beans.factory.annotation.Qualifier(AgentSideEffectExecutorConfig.BEAN_NAME)
        Executor sideEffectExecutor
    ) {
        this.runClient = runClient;
        this.contextAssembler = contextAssembler;
        this.chapterSideEffectService = chapterSideEffectService;
        this.messageProducer = messageProducer;
        this.objectMapper = objectMapper;
        this.runRegistry = runRegistry;
        this.sessionTitleService = sessionTitleService;
        this.statusHub = statusHub;
        this.eventJournal = eventJournal;
        this.runtimeProperties = runtimeProperties;
        this.contentInternalClient = contentInternalClient;
        this.runMqPublisher = runMqPublisher;
        this.runLiveRedisSubscriber = runLiveRedisSubscriber;
        this.pgRunStreamService = pgRunStreamService;
        this.workerContextStore = workerContextStore;
        this.sideEffectExecutor = sideEffectExecutor;
    }

    public Flux<String> stream(Long userId, AgentStreamRequest request) {
        if (runtimeProperties.isQueuedMode()) {
            return pgRunStreamService.stream(userId, request);
        }
        String mode = AgentContextAssembler.normalizeAgentMode(request.mode());
        String sessionId = request.sessionId();
        if (sessionId == null || sessionId.isBlank()) {
            sessionId = "session_" + UUID.randomUUID();
        }
        String runId = AgentRunState.newRunId();
        String messageId = AgentRunState.newMessageId();
        log.info("开始步进编排 userId={}, sessionId={}, runId={}, mode={}", userId, sessionId, runId, mode);

        AssistantPersistCollector assistantCollector = new AssistantPersistCollector();
        AtomicBoolean persisted = new AtomicBoolean(false);
        String finalSessionId = sessionId;
        boolean hostMode = Boolean.TRUE.equals(request.hostMode());
        boolean pgRun = runtimeProperties.isPgRunEnabled();

        return Flux.<String>create(sink -> {
            AtomicBoolean clientAttached = new AtomicBoolean(true);
            sink.onCancel(() -> {
                clientAttached.set(false);
                if (hostMode) {
                    log.info("SSE client detached (host mode) runId={}, sessionId={}", runId, finalSessionId);
                    publishHostRecovering(userId, finalSessionId, runId);
                }
            });
            Schedulers.boundedElastic().schedule(() -> {
            AgentRunState state;
            AgentRunCoordinator coordinator;
            HostModeEventFanout fanout = null;
            PgRunEventFanout pgFanout = pgRun
                ? new PgRunEventFanout(runMqPublisher, finalSessionId, runId)
                : null;
            try {
                Map<String, Object> context = contextAssembler.assemble(userId, finalSessionId, request);
                state = new AgentRunState(userId, finalSessionId, runId, messageId, request, context);
                if (pgRun) {
                    workerContextStore.save(runId, state.toContextDto());
                    bootstrapPgRun(userId, finalSessionId, runId, messageId, request.message(), mode);
                }
                coordinator = new AgentRunCoordinator(
                    state, runClient, objectMapper, chapterSideEffectService, sideEffectExecutor
                );
                runRegistry.register(coordinator);
                if (hostMode) {
                    eventJournal.beginRun(runId, userId, finalSessionId);
                    fanout = new HostModeEventFanout(
                        eventJournal, statusHub, objectMapper, userId, finalSessionId, runId
                    );
                }
            } catch (Exception ex) {
                log.error("assemble agent context failed runId={}: {}", runId, ex.getMessage());
                if (clientAttached.get()) {
                    sink.error(ex);
                }
                return;
            }
            HostModeEventFanout hostFanout = fanout;
            try {
                coordinator.run(frame -> {
                    collectAssistantDelta(frame, assistantCollector);
                    if (pgFanout != null) {
                        pgFanout.onFrame(frame);
                    }
                    if (hostFanout != null) {
                        hostFanout.onFrame(frame);
                        if (!clientAttached.get()) {
                            return;
                        }
                    }
                    if (clientAttached.get()) {
                        sink.next(frame);
                    }
                });
                if (clientAttached.get()) {
                    sink.complete();
                }
                if (state.isAborted()) {
                    persistTurn(
                        persisted,
                        state,
                        mode,
                        sanitizeAssistantText(assistantCollector.buildSanitized()),
                        "failed",
                        "aborted by user"
                    );
                } else {
                    persistTurn(
                        persisted,
                        state,
                        mode,
                        sanitizeAssistantText(assistantCollector.buildSanitized()),
                        "completed",
                        null
                    );
                }
            } catch (Exception ex) {
                log.error("run stream failed runId={}: {}", runId, ex.getMessage());
                if (clientAttached.get()) {
                    sink.error(ex);
                }
                persistTurn(
                    persisted,
                    state,
                    mode,
                    sanitizeAssistantText(assistantCollector.buildSanitized()),
                    "failed",
                    ex.getMessage()
                );
            } finally {
                runRegistry.unregister(runId);
                if (pgRun) {
                    runLiveRedisSubscriber.unsubscribe(runId);
                }
                if (hostMode) {
                    eventJournal.completeRun(runId);
                }
            }
            });
        }).subscribeOn(Schedulers.boundedElastic());
    }

    private void collectAssistantDelta(String frame, AssistantPersistCollector collector) {
        collector.onFrame(frame, objectMapper);
    }

    private void persistTurn(
        AtomicBoolean persisted,
        AgentRunState state,
        String mode,
        String assistantMessage,
        String status,
        String error
    ) {
        if (!persisted.compareAndSet(false, true)) {
            return;
        }
        AgentSessionPersistMessage message = new AgentSessionPersistMessage(
            state.getUserId(),
            state.getSessionId(),
            state.getRunId(),
            state.getMessageId(),
            mode,
            state.buildPersistedUserMessage(),
            assistantMessage,
            status,
            error
        );
        try {
            messageProducer.send(MqTopic.AGENT_SESSION, message);
            if (runtimeProperties.isPgRunEnabled()) {
                transitionPgRun(state.getRunId(), status, error);
            }
            log.info(
                "已发布会话持久化事件 userId={}, sessionId={}, runId={}, status={}",
                state.getUserId(),
                state.getSessionId(),
                state.getRunId(),
                status
            );
            sessionTitleService.maybeGenerateTitleAsync(
                state.getUserId(),
                state.getSessionId(),
                state.buildPersistedUserMessage(),
                assistantMessage,
                SessionTitleContext.extractNovelTitle(state.getAssembledContext())
            );
        } catch (Exception ex) {
            log.warn(
                "发送 AGENT_SESSION 消息失败 userId={}, sessionId={}, runId={}, err={}",
                state.getUserId(),
                state.getSessionId(),
                state.getRunId(),
                ex.getMessage()
            );
        }
    }

    private void bootstrapPgRun(
        Long userId,
        String sessionId,
        String runId,
        String messageId,
        String userMessage,
        String mode
    ) {
        try {
            contentInternalClient.createRun(
                runId,
                sessionId,
                userId,
                messageId + ":user",
                messageId + ":assistant",
                userMessage,
                mode
            );
            runLiveRedisSubscriber.subscribe(userId, sessionId, runId);
        } catch (Exception ex) {
            log.warn("pg run bootstrap failed runId={}: {}", runId, ex.getMessage());
        }
    }

    private void transitionPgRun(String runId, String status, String error) {
        try {
            String pgStatus = "FAILED";
            if ("completed".equals(status)) {
                pgStatus = "COMPLETED";
            } else if (error != null && error.contains("abort")) {
                pgStatus = "ABORTED";
            }
            contentInternalClient.transitionRun(runId, pgStatus, error);
        } catch (Exception ex) {
            log.warn("pg run transition failed runId={}: {}", runId, ex.getMessage());
        }
    }

    private void publishHostRecovering(Long userId, String sessionId, String runId) {
        HostModeEventFanout fanout = new HostModeEventFanout(
            eventJournal, statusHub, objectMapper, userId, sessionId, runId
        );
        fanout.publishRecovering("连接中断，任务在后台继续；正在通过托管通道同步进度…");
    }

    private String sanitizeAssistantText(String raw) {
        String clean = AgentTextSanitizer.sanitizeAssistantVisibleText(raw);
        if (clean.isBlank()) {
            return "我整理好了上下文，但本次没有生成可展示正文。请给我一句更明确的续写指令，我马上继续。";
        }
        return clean;
    }
}
