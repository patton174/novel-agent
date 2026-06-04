package com.novel.agent.pyai.orchestration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.novel.agent.pyai.dto.agent.AgentRunContextDto;
import com.novel.agent.pyai.dto.agent.AgentStreamRequest;
import com.novel.agent.pyai.dto.agent.PythonAgentStepRequest;
import com.novel.agent.pyai.service.AgentContextAssembler;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

public class AgentRunState {

    private final String runId;
    private final String sessionId;
    private final String messageId;
    private final Long userId;
    private final String mode;
    private final String userMessage;
    private final Map<String, Object> assembledContext;
    private final AtomicInteger sequence = new AtomicInteger(1);
    private final AtomicBoolean terminal = new AtomicBoolean(false);
    private final AtomicBoolean paused = new AtomicBoolean(false);
    private final AtomicBoolean aborted = new AtomicBoolean(false);

    private int stepIndex;
    private String currentTool;
    private Map<String, Object> currentToolInput = Map.of();
    private Map<String, Object> contextPatch = new HashMap<>();
    private Map<String, Object> selectedChoice;
    private String lastAction;
    private String lastTool;
    private String lastReason;
    private final StringBuilder thinkContent = new StringBuilder();
    private Map<String, Object> thinkToolInput = Map.of();

    private volatile CompletableFuture<Map<String, Object>> pendingInteraction = new CompletableFuture<>();
    private volatile CompletableFuture<Void> resumeSignal = new CompletableFuture<>();

    public AgentRunState(
        Long userId,
        String sessionId,
        String runId,
        String messageId,
        AgentStreamRequest request,
        Map<String, Object> assembledContext
    ) {
        this.userId = userId;
        this.sessionId = sessionId;
        this.runId = runId;
        this.messageId = messageId;
        this.mode = AgentContextAssembler.normalizeAgentMode(request.mode());
        this.userMessage = request.message();
        this.assembledContext = assembledContext;
        this.stepIndex = 0;
        this.currentTool = null;
        this.currentToolInput = Map.of();
    }

    public static String newRunId() {
        return "run_" + UUID.randomUUID();
    }

    public static String newMessageId() {
        return "message_" + UUID.randomUUID();
    }

    public int nextSequence() {
        return sequence.getAndIncrement();
    }

    public AgentRunContextDto toContextDto() {
        String chapterText = "";
        Object text = assembledContext.get("text");
        if (text != null) {
            chapterText = String.valueOf(text);
        }
        @SuppressWarnings("unchecked")
        List<Map<String, String>> history = assembledContext.get("history") instanceof List<?> list
            ? (List<Map<String, String>>) list
            : List.of();
        @SuppressWarnings("unchecked")
        Map<String, Object> preferences = assembledContext.get("preferences") instanceof Map<?, ?> map
            ? (Map<String, Object>) map
            : Map.of();
        @SuppressWarnings("unchecked")
        Map<String, Object> project = assembledContext.get("project") instanceof Map<?, ?> projectMap
            ? (Map<String, Object>) projectMap
            : Map.of();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> chapters = assembledContext.get("chapters") instanceof List<?> chapterList
            ? (List<Map<String, Object>>) chapterList
            : List.of();
        String currentChapterId = assembledContext.get("current_chapter_id") == null
            ? null
            : String.valueOf(assembledContext.get("current_chapter_id"));

        Object storyMemoryRaw = assembledContext.get("story_memory");
        String storyMemory = storyMemoryRaw == null ? "" : String.valueOf(storyMemoryRaw);

        return new AgentRunContextDto(
            runId,
            sessionId,
            messageId,
            userId,
            mode,
            userMessage,
            chapterText,
            history,
            storyMemory,
            preferences,
            project,
            chapters,
            currentChapterId,
            getNovelId(),
            stepIndex,
            lastTool,
            lastReason,
            contextPatch,
            selectedChoice
        );
    }

    public String getNovelId() {
        Object novelId = assembledContext.get("novel_id");
        return novelId == null ? null : String.valueOf(novelId);
    }

    public Map<String, Object> getAssembledContext() {
        return assembledContext;
    }

    public Map<String, Object> getContextPatchSnapshot() {
        return new HashMap<>(contextPatch);
    }

    public Map<String, Object> getMutableContextPatch() {
        return contextPatch;
    }

    public PythonAgentStepRequest toStepRequest() {
        return new PythonAgentStepRequest(toContextDto(), currentTool, currentToolInput);
    }

    public com.novel.agent.pyai.dto.agent.PythonAgentRunRequest toRunRequest() {
        return new com.novel.agent.pyai.dto.agent.PythonAgentRunRequest(toContextDto());
    }

    public void appendThinkContent(String text) {
        if (text != null && !text.isBlank()) {
            thinkContent.append(text);
        }
    }

    public void applyStepCompleted(JsonNode payload, ObjectMapper mapper) {
        lastAction = payload.path("action").asText("");
        lastTool = payload.path("step_kind").asText("");
        lastReason = payload.path("reason").asText("");
        JsonNode patch = payload.path("context_patch");
        if (patch.isObject()) {
            contextPatch.putAll(mapper.convertValue(patch, Map.class));
        }
        if ("end".equals(lastAction)) {
            currentTool = "end";
            currentToolInput = Map.of();
        } else {
            // continue / wait: orchestration handled by Python query_loop
            currentTool = null;
            currentToolInput = Map.of();
        }
        stepIndex++;
    }

    public void prepareNextStep() {
        // context patch already merged in applyStepCompleted
    }

    public void mergeContextPatch() {
        if (!contextPatch.isEmpty()) {
            assembledContext.putAll(contextPatch);
        }
    }

    public void submitInteraction(Map<String, Object> payload) {
        if (pendingInteraction != null && !pendingInteraction.isDone()) {
            pendingInteraction.complete(payload);
        }
    }

    public Map<String, Object> awaitInteraction() throws InterruptedException {
        if (aborted.get()) {
            return Map.of();
        }
        try {
            return pendingInteraction.get();
        } catch (java.util.concurrent.ExecutionException ex) {
            if (aborted.get()) {
                return Map.of();
            }
            Thread.currentThread().interrupt();
            throw new IllegalStateException("interaction wait failed", ex.getCause());
        }
    }

    public void resetInteractionWait() {
        pendingInteraction = new CompletableFuture<>();
    }

    public void pause() {
        paused.set(true);
        resumeSignal = new CompletableFuture<>();
    }

    public void resume() {
        paused.set(false);
        resumeSignal.complete(null);
    }

    public void awaitResume() throws InterruptedException {
        if (!paused.get() || aborted.get()) {
            return;
        }
        try {
            resumeSignal.get();
        } catch (java.util.concurrent.ExecutionException ex) {
            if (aborted.get()) {
                return;
            }
            Thread.currentThread().interrupt();
            throw new IllegalStateException("resume wait failed", ex.getCause());
        }
    }

    public void abort() {
        if (!aborted.compareAndSet(false, true)) {
            return;
        }
        terminal.set(true);
        paused.set(false);
        CompletableFuture<Map<String, Object>> pending = pendingInteraction;
        if (pending != null && !pending.isDone()) {
            pending.complete(Map.of());
        }
        CompletableFuture<Void> resume = resumeSignal;
        if (resume != null && !resume.isDone()) {
            resume.complete(null);
        }
    }

    public boolean isAborted() {
        return aborted.get();
    }

    public void markTerminal() {
        terminal.set(true);
    }

    public boolean isTerminal() {
        return terminal.get();
    }

    public boolean isPaused() {
        return paused.get();
    }

    public String getLastAction() {
        return lastAction;
    }

    public String getRunId() {
        return runId;
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getMessageId() {
        return messageId;
    }

    public Long getUserId() {
        return userId;
    }

    public String getMode() {
        return mode;
    }

    public String getUserMessage() {
        return userMessage;
    }

    // Original user message plus in-run interaction confirmations for session persistence.
    public String buildPersistedUserMessage() {
        StringBuilder sb = new StringBuilder(userMessage == null ? "" : userMessage.trim());
        Object raw = contextPatch.get("user_interactions");
        if (raw instanceof List<?> list) {
            for (Object item : list) {
                if (!(item instanceof Map<?, ?> map)) {
                    continue;
                }
                Object text = map.get("text");
                if (text == null || String.valueOf(text).isBlank()) {
                    continue;
                }
                String line = String.valueOf(text).trim();
                if (sb.indexOf(line) >= 0) {
                    continue;
                }
                if (sb.length() > 0) {
                    sb.append("\n\n");
                }
                sb.append(line);
            }
        }
        return sb.toString();
    }

    public String getCurrentTool() {
        return currentTool;
    }

    public String getLastTool() {
        return lastTool;
    }

    public void setSelectedChoice(Map<String, Object> choice) {
        this.selectedChoice = choice;
        if (choice != null) {
            this.contextPatch.put("selected_choice", choice);
        }
    }

    public ObjectNode baseEvent(ObjectMapper mapper, String type, String stepId) {
        ObjectNode node = mapper.createObjectNode();
        node.put("event_id", "evt_" + UUID.randomUUID().toString().replace("-", ""));
        node.put("run_id", runId);
        node.put("session_id", sessionId);
        node.put("message_id", messageId);
        node.put("step_id", stepId);
        node.putNull("parent_step_id");
        node.put("sequence", nextSequence());
        node.put("timestamp", Instant.now().toString());
        node.put("type", type);
        node.put("source", "pyai");
        node.put("persist", true);
        return node;
    }
}
