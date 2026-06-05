package com.novel.agent.pyai.orchestration;

import com.novel.agent.pyai.support.PyaiExceptions;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

public final class SseEventCodec {

    private static final java.util.Set<String> META_TYPES = java.util.Set.of(
        "run.started",
        "run.completed",
        "run.failed",
        "run.waiting",
        "run.recovering"
    );

    private SseEventCodec() {}

    public static String encode(ObjectMapper mapper, ObjectNode event) {
        try {
            return "event: agent-event\ndata: " + mapper.writeValueAsString(event) + "\n\n";
        } catch (Exception ex) {
            throw PyaiExceptions.internalError("SSE 编码失败");
        }
    }

    public static String rewriteAndSlim(String frame, int sequence, ObjectMapper mapper) {
        if (frame == null || frame.isBlank() || frame.startsWith("event: stream-end")) {
            return frame;
        }
        String data = extractData(frame);
        if (data == null) {
            return frame;
        }
        try {
            JsonNode root = mapper.readTree(data);
            if (root instanceof ObjectNode objectNode) {
                return encode(mapper, slimForClient(objectNode, sequence));
            }
        } catch (Exception ignored) {
            // keep original frame
        }
        return frame;
    }

    /** Strip envelope fields the frontend does not consume. */
    public static ObjectNode slimForClient(ObjectNode event, int sequence) {
        ObjectNode slim = event.objectNode();
        String type = event.path("type").asText("");
        slim.put("type", type);
        slim.put("sequence", sequence);
        if (event.hasNonNull("step_id")) {
            slim.put("step_id", event.path("step_id").asText());
        }
        if (event.hasNonNull("parent_step_id") && !event.path("parent_step_id").isNull()) {
            slim.put("parent_step_id", event.path("parent_step_id").asText());
        }
        if (META_TYPES.contains(type)) {
            if (event.hasNonNull("run_id")) {
                slim.put("run_id", event.path("run_id").asText());
            }
            if (event.hasNonNull("session_id")) {
                slim.put("session_id", event.path("session_id").asText());
            }
            if (event.hasNonNull("message_id")) {
                slim.put("message_id", event.path("message_id").asText());
            }
        }
        JsonNode payload = event.path("payload");
        if (payload.isObject()) {
            slim.set("payload", payload.deepCopy());
        } else {
            slim.set("payload", event.objectNode());
        }
        return slim;
    }

    public static String rewriteSequence(String frame, int sequence, ObjectMapper mapper) {
        return rewriteAndSlim(frame, sequence, mapper);
    }

    public static String extractData(String frame) {
        StringBuilder data = new StringBuilder();
        for (String line : frame.split("\n")) {
            if (line.startsWith("data:")) {
                data.append(line.substring(5).trim());
            }
        }
        return data.isEmpty() ? null : data.toString();
    }

    public static String extractEventType(String frame, ObjectMapper mapper) {
        String data = extractData(frame);
        if (data == null) {
            return "";
        }
        try {
            return mapper.readTree(data).path("type").asText("");
        } catch (Exception ex) {
            return "";
        }
    }

    public static JsonNode extractPayload(String frame, ObjectMapper mapper) {
        String data = extractData(frame);
        if (data == null) {
            return mapper.createObjectNode();
        }
        try {
            return mapper.readTree(data).path("payload");
        } catch (Exception ex) {
            return mapper.createObjectNode();
        }
    }
}
