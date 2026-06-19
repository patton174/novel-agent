package com.novel.agent.common.mq.agent;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AgentRunCommandMessage(
    @JsonProperty("command_id") String commandId,
    @JsonProperty("run_id") String runId,
    @JsonProperty("command_type") String commandType,
    @JsonProperty("payload_json") String payloadJson
) {
}
