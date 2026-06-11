package cn.novelstudio.platform.messaging.agent;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AgentRunDispatchMessage(
    @JsonProperty("job_id") String jobId,
    @JsonProperty("run_id") String runId,
    String action,
    @JsonProperty("command_id") String commandId,
    @JsonProperty("lease_owner") String leaseOwner,
    int attempt
) {
}
