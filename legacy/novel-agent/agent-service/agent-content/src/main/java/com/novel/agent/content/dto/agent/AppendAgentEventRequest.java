package com.novel.agent.content.dto.agent;

import lombok.Data;

@Data
public class AppendAgentEventRequest {
    private String eventId;
    private String eventType;
    private String source;
    private String payloadJson;
}
