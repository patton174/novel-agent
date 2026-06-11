package cn.novelstudio.module.agent.orchestration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.module.agent.util.AgentTextSanitizer;

/**
 * Collects assistant-visible text for session persistence from SSE frames.
 * Only {@code message.delta} and {@code output} tool results belong in the user-facing bubble.
 */
public final class AssistantPersistCollector {

    private final StringBuilder buffer = new StringBuilder();

    public void onFrame(String frame, ObjectMapper objectMapper) {
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
                    buffer.append(text);
                }
                return;
            }
            if ("tool.completed".equals(type)) {
                String name = root.path("payload").path("name").asText("");
                if ("output".equals(name)) {
                    String output = root.path("payload").path("output").asText("");
                    if (!output.isBlank()) {
                        buffer.append(output);
                    }
                }
            }
        } catch (Exception ignored) {
            // ignore malformed event frames
        }
    }

    public String buildSanitized() {
        return AgentTextSanitizer.sanitizeAssistantVisibleText(buffer.toString());
    }
}
