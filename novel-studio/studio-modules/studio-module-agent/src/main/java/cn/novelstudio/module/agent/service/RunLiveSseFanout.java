package cn.novelstudio.module.agent.service;

import cn.novelstudio.module.agent.orchestration.CcToolVisibility;
import cn.novelstudio.module.agent.orchestration.SseEventCodec;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
    private final Map<String, Consumer<String>> terminalHandlers = new ConcurrentHashMap<>();

    public RunLiveSseFanout(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void register(String runId, Consumer<String> sink) {
        if (runId == null || runId.isBlank() || sink == null) {
            return;
        }
        sinks.put(runId, sink);
    }

    public void registerTerminalHandler(String runId, Consumer<String> handler) {
        if (runId == null || runId.isBlank() || handler == null) {
            return;
        }
        terminalHandlers.put(runId, handler);
    }

    public void unregisterSink(String runId) {
        if (runId != null) {
            sinks.remove(runId);
        }
    }

    public void unregister(String runId) {
        if (runId != null) {
            sinks.remove(runId);
            terminalHandlers.remove(runId);
        }
    }

    /** 将 Redis / journal payload 转为客户端 SSE 帧；不可展示时返回 null。 */
    public String toClientSseFrame(String payloadJson) {
        String clientPayload = filterForClient(payloadJson);
        if (clientPayload == null || clientPayload.isBlank()) {
            return null;
        }
        return "event: agent-event\ndata: " + clientPayload + "\n\n";
    }

    public void onLivePayload(String runId, String payloadJson) {
        if (runId == null || payloadJson == null || payloadJson.isBlank()) {
            return;
        }
        Consumer<String> sink = sinks.get(runId);
        if (sink != null) {
            String frame = toClientSseFrame(payloadJson);
            if (frame != null) {
                sink.accept(frame);
            }
        }
        if (!isTerminalEvent(payloadJson)) {
            return;
        }
        if (sink != null) {
            sink.accept("event: stream-end\ndata: done\n\n");
            sinks.remove(runId);
        }
        Consumer<String> terminal = terminalHandlers.remove(runId);
        if (terminal != null) {
            terminal.accept(payloadJson);
        }
    }

    /**
     * Align queued-mode fanout with {@link cn.novelstudio.module.agent.orchestration.AgentRunCoordinator}:
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
