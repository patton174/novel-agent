package com.novel.agent.pyai.orchestration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.novel.agent.pyai.service.AgentStatusHub;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Host-mode: mirror coordinator SSE frames to journal + session status WebSocket.
 */
public final class HostModeEventFanout {

    private static final Logger log = LoggerFactory.getLogger(HostModeEventFanout.class);

    private final AgentRunEventJournal journal;
    private final AgentStatusHub statusHub;
    private final ObjectMapper objectMapper;
    private final Long userId;
    private final String sessionId;
    private final String runId;

    public HostModeEventFanout(
        AgentRunEventJournal journal,
        AgentStatusHub statusHub,
        ObjectMapper objectMapper,
        Long userId,
        String sessionId,
        String runId
    ) {
        this.journal = journal;
        this.statusHub = statusHub;
        this.objectMapper = objectMapper;
        this.userId = userId;
        this.sessionId = sessionId;
        this.runId = runId;
    }

    public void onFrame(String frame) {
        if (frame == null || frame.isBlank()) {
            return;
        }
        if (frame.startsWith("event: stream-end")) {
            journal.append(runId, "{\"type\":\"stream-end\",\"payload\":{}}");
            statusHub.publish(userId, sessionId, "{\"type\":\"stream-end\",\"payload\":{}}");
            return;
        }
        if (!frame.contains("event: agent-event")) {
            return;
        }
        String data = SseEventCodec.extractData(frame);
        if (data == null || data.isBlank()) {
            return;
        }
        journal.append(runId, data);
        statusHub.publish(userId, sessionId, data);
    }

    public void publishRecovering(String message) {
        try {
            ObjectNode root = objectMapper.createObjectNode();
            root.put("type", "run.recovering");
            root.put("run_id", runId);
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("message", message);
            root.set("payload", payload);
            String json = objectMapper.writeValueAsString(root);
            journal.append(runId, json);
            statusHub.publish(userId, sessionId, json);
        } catch (Exception ex) {
            log.warn("publishRecovering failed runId={}: {}", runId, ex.getMessage());
        }
    }
}
