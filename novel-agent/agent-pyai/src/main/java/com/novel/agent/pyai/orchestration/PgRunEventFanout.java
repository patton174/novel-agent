package com.novel.agent.pyai.orchestration;

import com.novel.agent.pyai.mq.AgentRunMqPublisher;

/**
 * PG Run 双轨：将 SSE agent-event 帧异步投递到 MQ → Consumer 落库 + Redis live。
 */
public final class PgRunEventFanout {

    private final AgentRunMqPublisher mqPublisher;
    private final String sessionId;
    private final String runId;

    public PgRunEventFanout(AgentRunMqPublisher mqPublisher, String sessionId, String runId) {
        this.mqPublisher = mqPublisher;
        this.sessionId = sessionId;
        this.runId = runId;
    }

    public void onFrame(String frame) {
        if (frame == null || frame.isBlank() || !frame.contains("event: agent-event")) {
            return;
        }
        String data = SseEventCodec.extractData(frame);
        if (data == null || data.isBlank()) {
            return;
        }
        mqPublisher.publishAgentEvent(runId, sessionId, data);
    }
}
