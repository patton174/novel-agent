package cn.novelstudio.platform.messaging.agent;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Run 事件消息（Worker/PyAI → MQ → Consumer → PG + Redis live）。
 */
public record AgentRunEventMessage(
    @JsonProperty("event_id") String eventId,
    @JsonProperty("run_id") String runId,
    @JsonProperty("session_id") String sessionId,
    @JsonProperty("event_type") String eventType,
    String source,
    @JsonProperty("payload_json") String payloadJson
) {
}
