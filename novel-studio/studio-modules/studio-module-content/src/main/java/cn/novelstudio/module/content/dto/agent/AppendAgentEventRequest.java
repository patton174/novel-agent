package cn.novelstudio.module.content.dto.agent;

import lombok.Data;

@Data
public class AppendAgentEventRequest {
    private String eventId;
    private String eventType;
    private String source;
    private String payloadJson;
}
