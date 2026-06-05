package com.novel.agent.content.dto.agent;

import lombok.Data;

@Data
public class UpsertAgentCheckpointRequest {
    private int stepIndex;
    private String lastAction;
    private String contextPatchJson;
    private String transcriptRef;
}
