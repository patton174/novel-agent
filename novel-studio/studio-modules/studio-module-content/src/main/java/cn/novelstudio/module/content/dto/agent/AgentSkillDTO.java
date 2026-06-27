package cn.novelstudio.module.content.dto.agent;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.List;
import java.util.UUID;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AgentSkillDTO(
    UUID id,
    String name,
    String description,
    String locale,
    boolean isSystem,
    List<String> tools,
    /** Latest platform version (official) or owner version (custom). */
    int version,
    String content,
    /** User's pinned version for official skills; null for custom skills. */
    Integer pinnedVersion,
    /** Follow latest official updates when true. */
    Boolean autoUpdate,
    /** Official skill has a newer version than the user's pin. */
    Boolean updateAvailable,
    /** In user's library (custom skill or referenced official). */
    Boolean inLibrary,
    /** Whether the skill is enabled for Agent catalog / picker. */
    Boolean enabled
) {}
