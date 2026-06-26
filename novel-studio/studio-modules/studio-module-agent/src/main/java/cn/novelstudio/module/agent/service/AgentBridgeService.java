package cn.novelstudio.module.agent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.platform.messaging.constant.MqTopic;
import cn.novelstudio.platform.messaging.producer.IMessageProducer;
import cn.novelstudio.module.agent.dto.agent.AgentSessionPersistMessage;
import cn.novelstudio.module.agent.dto.agent.AgentStreamRequest;
import cn.novelstudio.module.agent.orchestration.AgentRunCoordinator;
import cn.novelstudio.module.agent.orchestration.AssistantPersistCollector;
import cn.novelstudio.module.agent.orchestration.AgentRunEventJournal;
import cn.novelstudio.module.agent.orchestration.AgentRunRegistry;
import cn.novelstudio.module.agent.orchestration.AgentRunState;
import cn.novelstudio.module.agent.client.ContentInternalClient;
import cn.novelstudio.module.agent.config.AgentRuntimeProperties;
import cn.novelstudio.module.agent.config.AgentSideEffectExecutorConfig;
import cn.novelstudio.module.agent.mq.AgentRunMqPublisher;
import cn.novelstudio.module.agent.orchestration.HostModeEventFanout;
import cn.novelstudio.module.agent.orchestration.PgRunEventFanout;
import cn.novelstudio.module.agent.orchestration.SseEventCodec;
import cn.novelstudio.module.agent.util.AgentTextSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
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
    private final Executor sideEffectExecutor;
    private final RunProxyRegistry runProxyRegistry;
    private final RunProxyLiveHub runProxyLiveHub;
    private final QuotaGateService quotaGateService;
    private final AgentModelResolver modelResolver;
    private final cn.novelstudio.platform.i18n.StudioMessages messages;
    private final cn.novelstudio.platform.i18n.ResultLocalizer resultLocalizer;

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
        @org.springframework.beans.factory.annotation.Qualifier(AgentSideEffectExecutorConfig.BEAN_NAME)
        Executor sideEffectExecutor,
        RunProxyRegistry runProxyRegistry,
        RunProxyLiveHub runProxyLiveHub,
        QuotaGateService quotaGateService,
        AgentModelResolver modelResolver,
        cn.novelstudio.platform.i18n.StudioMessages messages,
        cn.novelstudio.platform.i18n.ResultLocalizer resultLocalizer
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
        this.sideEffectExecutor = sideEffectExecutor;
        this.runProxyRegistry = runProxyRegistry;
        this.runProxyLiveHub = runProxyLiveHub;
        this.quotaGateService = quotaGateService;
        this.modelResolver = modelResolver;
        this.messages = messages;
        this.resultLocalizer = resultLocalizer;
    }

    public Flux<String> stream(Long userId, AgentStreamRequest request) {
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
        boolean pgRun = runtimeProperties.isPgRunEnabled();
        runProxyRegistry.claim(runId);

        return Flux.<String>create(sink -> {
            AtomicBoolean clientAttached = new AtomicBoolean(true);
            java.util.function.Consumer<String> primarySink = frame -> {
                if (clientAttached.get()) {
                    sink.next(frame);
                }
            };
            runProxyLiveHub.attach(runId, primarySink);
            sink.onCancel(() -> {
                clientAttached.set(false);
                runProxyLiveHub.detach(runId, primarySink);
                log.info("SSE client detached runId={}, sessionId={}", runId, finalSessionId);
                publishHostRecovering(userId, finalSessionId, runId);
            });
            sink.onDispose(() -> runProxyLiveHub.detach(runId, primarySink));
            Schedulers.boundedElastic().schedule(() -> {
            AgentRunState state;
            AgentRunCoordinator coordinator;
            HostModeEventFanout fanout = null;
            PgRunEventFanout pgFanout = pgRun
                ? new PgRunEventFanout(runMqPublisher, finalSessionId, runId)
                : null;
            try {
                Map<String, Object> modelConfig = modelResolver.resolve(
                    userId, request.modelOverride(), request.message()
                );
                boolean byok = modelResolver.isByok(modelConfig);

                CompletableFuture<QuotaGateResult> quotaFuture = CompletableFuture.supplyAsync(() -> {
                    if (byok) {
                        return null;
                    }
                    return quotaGateService.assertCanStartRun(userId);
                });
                CompletableFuture<Map<String, Object>> contextFuture = CompletableFuture.supplyAsync(
                    () -> contextAssembler.assemble(userId, finalSessionId, request)
                );
                CompletableFuture.allOf(quotaFuture, contextFuture).join();
                quotaFuture.join();
                Map<String, Object> context = contextFuture.join();
                context.put("model_config", modelConfig);
                state = new AgentRunState(userId, finalSessionId, runId, messageId, request, context);
                if (pgRun) {
                    bootstrapPgRun(userId, finalSessionId, runId, messageId, request.message(), mode);
                }
                coordinator = new AgentRunCoordinator(
                    state, runClient, objectMapper, chapterSideEffectService, sideEffectExecutor, resultLocalizer
                );
                runRegistry.register(coordinator);
                eventJournal.beginRun(runId, userId, finalSessionId);
                fanout = new HostModeEventFanout(
                    eventJournal, statusHub, objectMapper, userId, finalSessionId, runId
                );
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
                    }
                    runProxyLiveHub.publish(runId, frame);
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
                        "agent.run.aborted_by_user"
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
                eventJournal.completeRun(runId);
                runProxyRegistry.release(runId);
                runProxyLiveHub.complete(runId);
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
        fanout.publishRecovering(messages.get("agent.stream.recovering"));
    }

    private String sanitizeAssistantText(String raw) {
        String clean = AgentTextSanitizer.sanitizeAssistantVisibleText(raw);
        if (clean.isBlank()) {
            return messages.get("agent.stream.empty_assistant");
        }
        return clean;
    }
}
