package cn.novelstudio.module.content.dto.agent;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class CrewTemplateDTO {
    private String id;
    private String displayName;
    private String description;
    private List<Map<String, Object>> stages;
    private Boolean isSystem;
}
