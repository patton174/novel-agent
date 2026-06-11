package cn.novelstudio.module.content.dto.agent;

import lombok.Data;

@Data
public class RecordAgentCommandRequest {
    private String commandId;
    private String commandType;
    private String payloadJson;
}
