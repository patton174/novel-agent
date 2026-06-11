package cn.novelstudio.module.agent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
        String frame = "event: agent-event\ndata: " + payloadJson + "\n\n";
        sink.accept(frame);
        if (isTerminalEvent(payloadJson)) {
            sink.accept("event: stream-end\ndata: done\n\n");
            unregister(runId);
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
