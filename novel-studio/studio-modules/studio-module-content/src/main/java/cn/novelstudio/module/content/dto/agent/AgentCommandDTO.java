package cn.novelstudio.module.content.dto.agent;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AgentCommandDTO {
    private String id;
    private String runId;
    private String commandType;
    private String payloadJson;
    private String status;
    private Instant createdAt;
    private boolean duplicate;
}
