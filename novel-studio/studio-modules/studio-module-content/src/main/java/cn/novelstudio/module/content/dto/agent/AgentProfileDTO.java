package cn.novelstudio.module.content.dto.agent;

import lombok.Data;

import java.util.List;

@Data
public class AgentProfileDTO {
    private String id;
    private String displayName;
    private String description;
    private String systemPromptTemplate;
    private List<String> toolAllowlist;
    private String modelOverride;
    private Integer maxTurns;
    private Integer maxOutputTokens;
    private List<String> skillIds;
    private Boolean isSystem;
}
