package com.novel.agent.pyai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.novel.agent.pyai.orchestration.CcToolVisibility;
import com.novel.agent.pyai.orchestration.SseEventCodec;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

/**
 * Bridges Redis run:live payloads to per-run SSE sinks (queued worker mode).
 */
@Component
public class RunLiveSseFanout {

    private final ObjectMapper objectMapper;
    private final Map<String, Consumer<String>> sinks = new ConcurrentHashMap<>();

    public RunLiveSseFanout(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void register(String runId, Consumer<String> sink) {
        if (runId == null || runId.isBlank() || sink == null) {
            return;
        }
        sinks.put(runId, sink);
    }

    public void unregister(String runId) {
        if (runId != null) {
            sinks.remove(runId);
        }
    }

    public void onLivePayload(String runId, String payloadJson) {
        if (runId == null || payloadJson == null || payloadJson.isBlank()) {
            return;
        }
        Consumer<String> sink = sinks.get(runId);
        if (sink == null) {
            return;
        }
        String clientPayload = filterForClient(payloadJson);
        if (clientPayload == null) {
            return;
        }
        String frame = "event: agent-event\ndata: " + clientPayload + "\n\n";
        sink.accept(frame);
        if (isTerminalEvent(payloadJson)) {
            sink.accept("event: stream-end\ndata: done\n\n");
            unregister(runId);
        }
    }

    /**
     * Align queued-mode fanout with {@link com.novel.agent.pyai.orchestration.AgentRunCoordinator}:
     * drop internal planner events and hidden tool lifecycle frames.
     */
    String filterForClient(String payloadJson) {
        try {
            JsonNode root = objectMapper.readTree(payloadJson);
            if (!(root instanceof ObjectNode objectNode)) {
                return payloadJson;
            }
            String type = objectNode.path("type").asText("");
            if ("step.completed".equals(type) || "plan.result".equals(type)) {
                return null;
            }
            if ("step.started".equals(type)) {
                String tool = objectNode.path("payload").path("tool").asText("");
                if (CcToolVisibility.shouldSkipStepStartedForward(tool)) {
                    return null;
                }
            }
            if (type.startsWith("tool.")) {
                JsonNode payload = objectNode.path("payload");
                String name = payload.path("name").asText("");
                if ("tool.completed".equals(type)) {
                    if (CcToolVisibility.isHiddenUiTool(name)
                        && !CcToolVisibility.shouldForwardToolCompletedToClient(name)) {
                        return null;
                    }
                } else if (CcToolVisibility.isHiddenUiTool(name)) {
                    return null;
                }
            }
            int seq = objectNode.path("sequence").asInt(0);
            return objectMapper.writeValueAsString(SseEventCodec.slimForClient(objectNode, seq));
        } catch (Exception ignored) {
            return payloadJson;
        }
    }

    private boolean isTerminalEvent(String payloadJson) {
        try {
            JsonNode root = objectMapper.readTree(payloadJson);
            String type = root.path("type").asText("");
            return "run.completed".equals(type) || "run.failed".equals(type);
        } catch (Exception ignored) {
            return false;
        }
    }
}
