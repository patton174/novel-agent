package com.novel.agent.pyai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.mq.constant.MqTopic;
import com.novel.agent.common.mq.producer.IMessageProducer;
import com.novel.agent.pyai.dto.agent.AgentSessionPersistMessage;
import com.novel.agent.pyai.dto.agent.AgentStreamRequest;
import com.novel.agent.pyai.orchestration.AgentRunCoordinator;
import com.novel.agent.pyai.orchestration.AgentRunEventJournal;
import com.novel.agent.pyai.orchestration.AgentRunRegistry;
import com.novel.agent.pyai.orchestration.AgentRunState;
import com.novel.agent.pyai.orchestration.HostModeEventFanout;
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

    public AgentBridgeService(
        PythonAgentRunClient runClient,
        AgentContextAssembler contextAssembler,
        ChapterSideEffectService chapterSideEffectService,
        IMessageProducer messageProducer,
        ObjectMapper objectMapper,
        AgentRunRegistry runRegistry,
        SessionTitleService sessionTitleService,
        AgentStatusHub statusHub,
        AgentRunEventJournal eventJournal
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

        StringBuilder assistantBuffer = new StringBuilder();
        AtomicBoolean persisted = new AtomicBoolean(false);
        String finalSessionId = sessionId;
        boolean hostMode = Boolean.TRUE.equals(request.hostMode());

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
            try {
                Map<String, Object> context = contextAssembler.assemble(userId, finalSessionId, request);
                state = new AgentRunState(userId, finalSessionId, runId, messageId, request, context);
                coordinator = new AgentRunCoordinator(
                    state, runClient, objectMapper, chapterSideEffectService
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
                    collectAssistantDelta(frame, assistantBuffer);
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
                        sanitizeAssistantText(assistantBuffer.toString()),
                        "failed",
                        "aborted by user"
                    );
                } else {
                    persistTurn(
                        persisted,
                        state,
                        mode,
                        sanitizeAssistantText(assistantBuffer.toString()),
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
                    sanitizeAssistantText(assistantBuffer.toString()),
                    "failed",
                    ex.getMessage()
                );
            } finally {
                runRegistry.unregister(runId);
                if (hostMode) {
                    eventJournal.completeRun(runId);
                }
            }
            });
        }).subscribeOn(Schedulers.boundedElastic());
    }

    private void appendToolHistorySnippet(StringBuilder assistantBuffer, JsonNode payload) {
        if (payload == null || payload.isMissingNode()) {
            return;
        }
        String summary = payload.path("output_summary").asText("").trim();
        if (summary.isBlank()) {
            JsonNode labels = payload.path("result_labels");
            if (labels.isArray() && !labels.isEmpty()) {
                StringBuilder joined = new StringBuilder();
                for (JsonNode label : labels) {
                    String text = label.asText("").trim();
                    if (text.isBlank()) {
                        continue;
                    }
                    if (!joined.isEmpty()) {
                        joined.append("、");
                    }
                    joined.append(text);
                }
                summary = joined.toString().trim();
            }
        }
        if (summary.isBlank()) {
            return;
        }
        String name = payload.path("name").asText("").trim();
        String prefix = name.isBlank() ? "" : name + "：";
        if (!assistantBuffer.isEmpty() && assistantBuffer.charAt(assistantBuffer.length() - 1) != '\n') {
            assistantBuffer.append('\n');
        }
        assistantBuffer.append(prefix).append(summary);
    }

    private void collectAssistantDelta(String frame, StringBuilder assistantBuffer) {
        if (frame == null || frame.isBlank() || !frame.contains("event: agent-event")) {
            return;
        }
        String data = SseEventCodec.extractData(frame);
        if (data == null || data.isBlank()) {
            return;
        }
        try {
            JsonNode root = objectMapper.readTree(data);
            String type = root.path("type").asText("");
            if ("message.delta".equals(type)) {
                String text = root.path("payload").path("text").asText("");
                if (!text.isBlank()) {
                    assistantBuffer.append(text);
                }
                return;
            }
            if ("tool.completed".equals(type)) {
                String name = root.path("payload").path("name").asText("");
                if ("output".equals(name)) {
                    String output = root.path("payload").path("output").asText("");
                    if (!output.isBlank()) {
                        assistantBuffer.append(output);
                    }
                    return;
                }
                if (assistantBuffer.length() < 4000) {
                    appendToolHistorySnippet(assistantBuffer, root.path("payload"));
                }
            }
        } catch (Exception ignored) {
            // ignore malformed event frames
        }
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
            log.info(
                "已发布会话持久化事件 userId={}, sessionId={}, runId={}, status={}",
                state.getUserId(),
                state.getSessionId(),
                state.getRunId(),
                status
            );
            String novelTitle = "";
            Object project = state.getAssembledContext().get("project");
            if (project instanceof Map<?, ?> projectMap) {
                Object title = projectMap.get("title");
                if (title == null) {
                    title = projectMap.get("name");
                }
                if (title != null) {
                    novelTitle = String.valueOf(title);
                }
            }
            sessionTitleService.maybeGenerateTitleAsync(
                state.getUserId(),
                state.getSessionId(),
                state.buildPersistedUserMessage(),
                assistantMessage,
                novelTitle
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
