package cn.novelstudio.module.agent.orchestration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Turns {@code step.llm.delta} chunks into {@code message.*} SSE for the frontend.
 */
public final class WriteContentStreamBridge {

    private static final int MIN_FLUSH_CHARS = 16;
    private static final int MAX_FLUSH_CHARS = 32;

    private final AgentRunState state;
    private final ObjectMapper objectMapper;
    private final DisplayContentJsonExtractor extractor = new DisplayContentJsonExtractor();
    private final String messageStepId =
        "step_msg_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    private final StringBuilder deltaBuffer = new StringBuilder();
    private boolean messageStarted;

    public WriteContentStreamBridge(AgentRunState state, ObjectMapper objectMapper) {
        this.state = state;
        this.objectMapper = objectMapper;
    }

    public List<String> onLlmDelta(String llmChunk) {
        String delta = extractor.feed(llmChunk);
        List<String> frames = new ArrayList<>();
        if (delta.isEmpty()) {
            return frames;
        }
        if (!messageStarted) {
            frames.add(encodeMessageEvent("message.started", messagePayload("assistant")));
            messageStarted = true;
        }
        deltaBuffer.append(delta);
        frames.addAll(flushBuffered(false));
        return frames;
    }

    public List<String> complete() {
        if (!messageStarted) {
            return List.of();
        }
        List<String> frames = new ArrayList<>(flushBuffered(true));
        frames.add(encodeMessageEvent("message.completed", messagePayload("assistant")));
        return frames;
    }

    private List<String> flushBuffered(boolean forceAll) {
        List<String> frames = new ArrayList<>();
        while (deltaBuffer.length() >= MIN_FLUSH_CHARS
            || (forceAll && !deltaBuffer.isEmpty())) {
            int take = forceAll
                ? deltaBuffer.length()
                : Math.min(deltaBuffer.length(), MAX_FLUSH_CHARS);
            if (take <= 0) {
                break;
            }
            String piece = deltaBuffer.substring(0, take);
            deltaBuffer.delete(0, take);
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("text", piece);
            frames.add(encodeMessageEvent("message.delta", payload));
            if (!forceAll) {
                break;
            }
        }
        return frames;
    }

    private ObjectNode messagePayload(String role) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("role", role);
        return payload;
    }

    private String encodeMessageEvent(String type, ObjectNode payload) {
        ObjectNode event = state.baseEvent(objectMapper, type, messageStepId);
        event.set("payload", payload);
        return SseEventCodec.encode(
            objectMapper,
            SseEventCodec.slimForClient(event, event.path("sequence").asInt())
        );
    }

}
