package com.novel.agent.auth.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class HeartbeatRequest {

    private String sid;
    private Long ts;
    private String fingerprint;
    private Map<String, Object> envDelta;
    private List<String> activeRunIds;
}
