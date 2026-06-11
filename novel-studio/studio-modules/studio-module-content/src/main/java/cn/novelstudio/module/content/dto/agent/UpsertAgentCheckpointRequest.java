package cn.novelstudio.module.content.dto.agent;

import lombok.Data;

@Data
public class UpsertAgentCheckpointRequest {
    private int stepIndex;
    private String lastAction;
    private String contextPatchJson;
    private String transcriptRef;
}
