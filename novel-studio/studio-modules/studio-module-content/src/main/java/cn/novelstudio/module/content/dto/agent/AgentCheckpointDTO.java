package cn.novelstudio.module.content.dto.agent;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AgentCheckpointDTO {
    private String runId;
    private int stepIndex;
    private String lastAction;
    private String contextPatchJson;
    private String transcriptRef;
    private int version;
    private Instant updatedAt;
}
