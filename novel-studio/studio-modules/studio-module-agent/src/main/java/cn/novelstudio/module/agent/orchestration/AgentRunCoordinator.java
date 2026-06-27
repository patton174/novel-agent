package cn.novelstudio.module.agent.orchestration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import cn.novelstudio.module.agent.client.ContentInternalClient;
import cn.novelstudio.module.agent.service.ChapterSideEffectService;
import cn.novelstudio.module.agent.service.PythonAgentRunClient;
import cn.novelstudio.platform.i18n.ResultLocalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

/**
 * Thin SSE gateway: proxies Python {@code /agent/run/stream} query loop.
 */
public class AgentRunCoordinator {

    private static final Logger log = LoggerFactory.getLogger(AgentRunCoordinator.class);

    private final AgentRunState state;
    private final PythonAgentRunClient runClient;
    private final ObjectMapper objectMapper;
    private final ChapterSideEffectService chapterSideEffectService;
    private final Executor sideEffectExecutor;
    private final ResultLocalizer resultLocalizer;
    private final ContentInternalClient contentInternalClient;
    private final boolean pgRunEnabled;
    private volatile Consumer<String> emitter;
    private volatile String llmStreamTool;
    private volatile CompletableFuture<Void> pendingSideEffect = CompletableFuture.completedFuture(null);
    private volatile ChapterPersistFailure pendingChapterPersistFailure;

    private record ChapterPersistFailure(
        String stepId,
        String tool,
        String error,
        String chapterId,
        String title,
        String displayLabel,
        int listIndex,
        int sortOrder
    ) {}

    public AgentRunCoordinator(
        AgentRunState state,
        PythonAgentRunClient runClient,
        ObjectMapper objectMapper,
        ChapterSideEffectService chapterSideEffectService,
        Executor sideEffectExecutor,
        ResultLocalizer resultLocalizer,
        ContentInternalClient contentInternalClient,
        boolean pgRunEnabled
    ) {
        this.state = state;
        this.runClient = runClient;
        this.objectMapper = objectMapper;
        this.chapterSideEffectService = chapterSideEffectService;
        this.sideEffectExecutor = sideEffectExecutor;
        this.resultLocalizer = resultLocalizer;
        this.contentInternalClient = contentInternalClient;
        this.pgRunEnabled = pgRunEnabled;
    }

    public String getRunId() {
        return state.getRunId();
    }

    public AgentRunState getState() {
        return state;
    }

    public void run(Consumer<String> emit) {
        this.emitter = emit;
        AtomicReference<String> streamError = new AtomicReference<>();
        WriteContentStreamBridge contentBridge = new WriteContentStreamBridge(state, objectMapper);
        try {
            emit.accept(buildRunStarted());
            runClient.runStream(state.toRunRequest())
                .doOnNext(frame -> {
                    if (frame.startsWith("event: stream-end")) {
                        return;
                    }
                    if (state.isAborted()) {
                        return;
                    }
                    String type = SseEventCodec.extractEventType(frame, objectMapper);
                    if ("run.failed".equals(type)) {
                        JsonNode payload = SseEventCodec.extractPayload(frame, objectMapper);
                        streamError.set(payload.path("error").asText("agent.run.stream_error"));
                    }
                    if ("subagent.started".equals(type)) {
                        persistSubRun(SseEventCodec.extractPayload(frame, objectMapper));
                    }
                    if ("think.delta".equals(type)) {
                        String text = SseEventCodec.extractPayload(frame, objectMapper).path("text").asText("");
                        state.appendThinkContent(text);
                    }
                    if ("step.started".equals(type)) {
                        llmStreamTool = SseEventCodec.extractPayload(frame, objectMapper).path("tool").asText("");
                        if (shouldSkipStepStartedForward(llmStreamTool)) {
                            return;
                        }
                    }
                    if ("step.llm.delta".equals(type)) {
                        if (!shouldBridgeLlmToChat(llmStreamTool)) {
                            forwardFrame(emit, frame);
                            return;
                        }
                        String text = SseEventCodec.extractPayload(frame, objectMapper).path("text").asText("");
                        for (String out : contentBridge.onLlmDelta(text)) {
                            emit.accept(out);
                        }
                        return;
                    }
                    if ("step.completed".equals(type)) {
                        if (shouldBridgeLlmToChat(llmStreamTool)) {
                            JsonNode payload = SseEventCodec.extractPayload(frame, objectMapper);
                            if (payload.path("streamed_llm").asBoolean(false)) {
                                for (String out : contentBridge.complete()) {
                                    emit.accept(out);
                                }
                            }
                        }
                        final String completedFrame = frame;
                        final String completedStepId = extractStepId(completedFrame);
                        final String completedTool = llmStreamTool;
                        pendingSideEffect = CompletableFuture.runAsync(() -> {
                            mergeStepCompleted(completedFrame);
                            try {
                                applyChapterSideEffects();
                            } catch (Exception ex) {
                                String detail = ex.getMessage() == null || ex.getMessage().isBlank()
                                    ? resolveMessage("agent.chapter.persist_side_effect_failed")
                                    : resolveMessage(ex.getMessage());
                                if (completedStepId != null && !completedStepId.isBlank()) {
                                    pendingChapterPersistFailure = chapterPersistFailureFromPatch(
                                        completedStepId,
                                        completedTool == null || completedTool.isBlank() ? "Write" : completedTool,
                                        detail
                                    );
                                }
                                log.warn(
                                    "chapter side effect failed runId={} stepId={}: {}",
                                    state.getRunId(),
                                    completedStepId,
                                    detail
                                );
                            }
                        }, sideEffectExecutor);
                        return;
                    }
                    forwardFrame(emit, frame);
                })
                .doOnError(ex -> {
                    log.error("run stream error runId={}: {}", state.getRunId(), ex.getMessage());
                    streamError.set(ex.getMessage() == null || ex.getMessage().isBlank()
                        ? "agent.run.stream_error"
                        : ex.getMessage());
                })
                .blockLast();

            awaitPendingSideEffects();

            if (state.isAborted()) {
                emit.accept(buildRunFailed("agent.run.aborted_by_user"));
            } else if (streamError.get() != null && !streamError.get().isBlank()) {
                emit.accept(buildRunFailed(streamError.get()));
            } else {
                emit.accept(buildRunCompleted());
            }
            emit.accept("event: stream-end\ndata: done\n\n");
        } finally {
            this.emitter = null;
        }
    }

    private void forwardFrame(Consumer<String> emit, String frame) {
        String type = SseEventCodec.extractEventType(frame, objectMapper);
        if (shouldDropClientFrame(type, frame)) {
            return;
        }
        emit.accept(SseEventCodec.rewriteAndSlim(frame, state.nextSequence(), objectMapper));
    }

    /** Drop internal planner / hidden tool lifecycle events (CC visibility). */
    private boolean shouldDropClientFrame(String type, String frame) {
        if (type == null || type.isBlank()) {
            return false;
        }
        if ("plan.result".equals(type)) {
            return true;
        }
        if (!type.startsWith("tool.")) {
            return false;
        }
        JsonNode payload = SseEventCodec.extractPayload(frame, objectMapper);
        String name = payload.path("name").asText("");
        if ("tool.completed".equals(type) && CcToolVisibility.shouldForwardToolCompletedToClient(name)) {
            return false;
        }
        return CcToolVisibility.isHiddenUiTool(name);
    }

    private static boolean shouldSkipStepStartedForward(String tool) {
        return CcToolVisibility.shouldSkipStepStartedForward(tool);
    }

    private void mergeStepCompleted(String frame) {
        try {
            String data = SseEventCodec.extractData(frame);
            JsonNode root = objectMapper.readTree(data);
            state.applyStepCompleted(root.path("payload"), objectMapper);
        } catch (Exception ex) {
            log.warn("parse step.completed failed: {}", ex.getMessage());
        }
    }

    public void submitInteraction(Map<String, Object> payload) {
        applyInteraction(payload);
        state.mergeContextPatch();
        applyChapterSideEffects();
        runClient.submitInteraction(state.getRunId(), payload);
    }

    public void pause() {
        state.pause();
        runClient.pauseRun(state.getRunId());
        Consumer<String> emit = emitter;
        if (emit != null) {
            emit.accept(buildRunPaused());
        }
    }

    public void resume() {
        state.resume();
        runClient.resumeRun(state.getRunId());
        Consumer<String> emit = emitter;
        if (emit != null) {
            emit.accept(buildRunResumed());
        }
    }

    public void abort() {
        if (state.isTerminal() || state.isAborted()) {
            return;
        }
        state.abort();
        runClient.abortRun(state.getRunId());
        Consumer<String> emit = emitter;
        if (emit != null) {
            emit.accept(buildRunFailed("agent.run.aborted_by_user"));
            emit.accept("event: stream-end\ndata: done\n\n");
        }
    }

    private void applyChapterSideEffects() {
        if (state.getUserId() == null || state.getNovelId() == null || state.getNovelId().isBlank()) {
            return;
        }
        chapterSideEffectService.applySideEffects(
            state.getUserId(),
            state.getNovelId(),
            state.getMutableContextPatch()
        );
    }

    private void awaitPendingSideEffects() {
        CompletableFuture<Void> pending = pendingSideEffect;
        if (pending == null) {
            return;
        }
        try {
            pending.get(120, TimeUnit.SECONDS);
        } catch (Exception ex) {
            log.warn("await chapter side effect failed runId={}: {}", state.getRunId(), ex.getMessage());
        }
        ChapterPersistFailure failure = pendingChapterPersistFailure;
        Consumer<String> emit = emitter;
        if (failure != null && emit != null && failure.stepId() != null && !failure.stepId().isBlank()) {
            emit.accept(buildChapterPersistFailed(failure));
            pendingChapterPersistFailure = null;
        }
    }

    private String extractStepId(String frame) {
        try {
            String data = SseEventCodec.extractData(frame);
            if (data == null || data.isBlank()) {
                return "";
            }
            return objectMapper.readTree(data).path("step_id").asText("");
        } catch (Exception ex) {
            return "";
        }
    }

    private void applyInteraction(Map<String, Object> interaction) {
        if (interaction == null) {
            return;
        }
        appendUserInteractionToPatch(interaction);
        Object input = interaction.get("input");
        if (input instanceof String text && !text.isBlank()) {
            Map<String, Object> custom = new HashMap<>();
            custom.put("id", "custom");
            custom.put("title", text.trim());
            custom.put("description", "");
            state.setSelectedChoice(custom);
            return;
        }
        Object selected = interaction.get("selected");
        if (selected instanceof Iterable<?> iterable) {
            java.util.List<Map<String, Object>> picked = new java.util.ArrayList<>();
            for (Object item : iterable) {
                if (item instanceof Map<?, ?> map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> choice = (Map<String, Object>) map;
                    picked.add(choice);
                }
            }
            if (picked.isEmpty()) {
                return;
            }
            if (picked.size() == 1) {
                state.setSelectedChoice(picked.get(0));
            }
        }
    }

    private void appendUserInteractionToPatch(Map<String, Object> interaction) {
        String text = summarizeInteraction(interaction);
        if (text == null || text.isBlank()) {
            return;
        }
        Map<String, Object> patch = state.getMutableContextPatch();
        @SuppressWarnings("unchecked")
        java.util.List<Map<String, Object>> log = patch.get("user_interactions") instanceof java.util.List<?> list
            ? new java.util.ArrayList<>((java.util.List<Map<String, Object>>) list)
            : new java.util.ArrayList<>();
        for (Map<String, Object> existing : log) {
            if (text.equals(String.valueOf(existing.getOrDefault("text", "")).trim())) {
                return;
            }
        }
        Map<String, Object> entry = new HashMap<>();
        entry.put("type", String.valueOf(interaction.getOrDefault("type", "interaction")));
        entry.put("text", text);
        log.add(entry);
        patch.put("user_interactions", log);
    }

    private String summarizeInteraction(Map<String, Object> interaction) {
        Object answers = interaction.get("answers");
        if (answers instanceof Map<?, ?> answerMap && !answerMap.isEmpty()) {
            String header = resolveMessage("agent.interaction.my_answers_header");
            String kvSep = resolveMessage("agent.interaction.kv_separator");
            StringBuilder sb = new StringBuilder(header);
            for (Map.Entry<?, ?> e : answerMap.entrySet()) {
                sb.append(e.getKey()).append(kvSep).append(String.valueOf(e.getValue())).append("\n");
            }
            return sb.toString().trim();
        }
        Object input = interaction.get("input");
        if (input instanceof String text && !text.isBlank()) {
            return text.trim();
        }
        Object selected = interaction.get("selected");
        if (selected instanceof Iterable<?> iterable) {
            String listSep = resolveMessage("agent.interaction.list_separator");
            StringBuilder sb = new StringBuilder();
            for (Object item : iterable) {
                if (!(item instanceof Map<?, ?> map)) {
                    continue;
                }
                Object title = map.get("title");
                if (title != null && !String.valueOf(title).isBlank()) {
                    if (sb.length() > 0) {
                        sb.append(listSep);
                    }
                    sb.append(String.valueOf(title).trim());
                }
            }
            return sb.toString();
        }
        return "";
    }

    private static boolean shouldBridgeLlmToChat(String tool) {
        return CcToolVisibility.shouldBridgeLlmToChat(tool);
    }

    private String buildRunStarted() {
        ObjectNode event = state.baseEvent(objectMapper, "run.started", "step_" + state.getRunId());
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("mode", state.getMode());
        payload.put("user_id", state.getUserId());
        payload.put("host_mode", true);
        event.set("payload", payload);
        return SseEventCodec.encode(
            objectMapper,
            SseEventCodec.slimForClient(event, event.path("sequence").asInt())
        );
    }

    private String buildRunCompleted() {
        ObjectNode event = state.baseEvent(objectMapper, "run.completed", "step_" + state.getRunId());
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("status", "ok");
        event.set("payload", payload);
        return SseEventCodec.encode(
            objectMapper,
            SseEventCodec.slimForClient(event, event.path("sequence").asInt())
        );
    }

    private String buildRunFailed(String errorKeyOrMessage) {
        ObjectNode event = state.baseEvent(objectMapper, "run.failed", "step_" + state.getRunId());
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("error", resolveMessage(errorKeyOrMessage));
        event.set("payload", payload);
        return SseEventCodec.encode(
            objectMapper,
            SseEventCodec.slimForClient(event, event.path("sequence").asInt())
        );
    }

    private String resolveMessage(String keyOrMessage) {
        return resultLocalizer == null ? keyOrMessage : resultLocalizer.resolveLiteral(keyOrMessage);
    }

    private String buildRunPaused() {
        ObjectNode event = state.baseEvent(objectMapper, "run.paused", "step_" + state.getRunId());
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("reason", resolveMessage("agent.run.paused_user"));
        event.set("payload", payload);
        return SseEventCodec.encode(
            objectMapper,
            SseEventCodec.slimForClient(event, event.path("sequence").asInt())
        );
    }

    private String buildRunResumed() {
        ObjectNode event = state.baseEvent(objectMapper, "run.resumed", "step_" + state.getRunId());
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("reason", resolveMessage("agent.run.resumed_user"));
        event.set("payload", payload);
        return SseEventCodec.encode(
            objectMapper,
            SseEventCodec.slimForClient(event, event.path("sequence").asInt())
        );
    }

    private String buildChapterPersistFailed(ChapterPersistFailure failure) {
        ObjectNode event = state.baseEvent(objectMapper, "chapter.persist.failed", failure.stepId());
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("error", failure.error());
        payload.put("tool", failure.tool());
        if (failure.chapterId() != null && !failure.chapterId().isBlank()) {
            payload.put("chapter_id", failure.chapterId());
        }
        if (failure.title() != null && !failure.title().isBlank()) {
            payload.put("title", failure.title());
        }
        if (failure.displayLabel() != null && !failure.displayLabel().isBlank()) {
            payload.put("display_label", failure.displayLabel());
        }
        if (failure.listIndex() > 0) {
            payload.put("list_index", failure.listIndex());
        }
        if (failure.sortOrder() > 0) {
            payload.put("sort_order", failure.sortOrder());
        }
        event.set("payload", payload);
        return SseEventCodec.encode(
            objectMapper,
            SseEventCodec.slimForClient(event, state.nextSequence())
        );
    }

    @SuppressWarnings("unchecked")
    private ChapterPersistFailure chapterPersistFailureFromPatch(
        String stepId,
        String tool,
        String error
    ) {
        Map<String, Object> patch = state.getMutableContextPatch();
        Object raw = patch.get("chapter_write");
        if (!(raw instanceof Map<?, ?> map)) {
            return new ChapterPersistFailure(stepId, tool, error, "", "", "", 0, 0);
        }
        Map<String, Object> write = objectMapper.convertValue(map, Map.class);
        String chapterId = String.valueOf(write.getOrDefault("chapter_id", ""));
        String title = String.valueOf(write.getOrDefault("title", ""));
        String displayLabel = String.valueOf(
            write.getOrDefault("display_label", write.getOrDefault("title", ""))
        );
        int listIndex = 0;
        int sortOrder = 0;
        Object li = write.get("list_index");
        if (li instanceof Number num) {
            listIndex = num.intValue();
        }
        Object so = write.get("sort_order");
        if (so instanceof Number num) {
            sortOrder = num.intValue();
        }
        return new ChapterPersistFailure(
            stepId,
            tool,
            error,
            chapterId,
            title,
            displayLabel,
            listIndex,
            sortOrder
        );
    }

    private void persistSubRun(JsonNode payload) {
        if (!pgRunEnabled || contentInternalClient == null || payload == null || payload.isMissingNode()) {
            return;
        }
        String childRunId = payload.path("child_run_id").asText("");
        if (childRunId.isBlank()) {
            return;
        }
        String profileId = payload.path("profile_id").asText("");
        if (profileId.isBlank()) {
            profileId = null;
        }
        String roleLabel = payload.path("role_label").asText("");
        if (roleLabel.isBlank()) {
            roleLabel = payload.path("description").asText("");
        }
        if (roleLabel.isBlank()) {
            roleLabel = null;
        }
        try {
            contentInternalClient.createSubRun(
                childRunId,
                state.getSessionId(),
                state.getUserId(),
                state.getRunId(),
                profileId,
                roleLabel,
                state.getMode()
            );
        } catch (Exception ex) {
            log.warn(
                "sub-run persist failed parentRunId={} childRunId={}: {}",
                state.getRunId(),
                childRunId,
                ex.getMessage()
            );
        }
    }
}
