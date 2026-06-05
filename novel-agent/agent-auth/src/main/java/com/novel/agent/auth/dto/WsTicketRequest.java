package com.novel.agent.auth.dto;

import lombok.Data;

@Data
public class WsTicketRequest {

    /** run | status */
    private String purpose;

    private String runId;

    private String sessionId;
}
