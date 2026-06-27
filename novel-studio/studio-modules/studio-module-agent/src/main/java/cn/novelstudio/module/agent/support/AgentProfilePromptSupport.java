package cn.novelstudio.module.agent.support;

import cn.novelstudio.module.content.entity.agent.AgentProfileEntity;
import cn.novelstudio.module.content.entity.agent.AgentSkillEntity;
import cn.novelstudio.module.content.support.AgentSkillPromptSupport;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class AgentProfilePromptSupport {

    private AgentProfilePromptSupport() {
    }

    public static Map<String, Object> toInternalProfileMap(
        AgentProfileEntity profile,
        List<String> resolvedToolAllowlist,
        List<AgentSkillEntity> resolvedSkills
    ) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", profile.getId());
        map.put("display_name", profile.getDisplayName());
        map.put("description", profile.getDescription());
        map.put("system_prompt_template", profile.getSystemPromptTemplate());
        map.put("tool_allowlist", profile.getToolAllowlistJson() == null ? List.of() : profile.getToolAllowlistJson());
        map.put("resolved_tool_allowlist", resolvedToolAllowlist);
        map.put("model_override", profile.getModelOverride());
        map.put("max_turns", profile.getMaxTurns());
        map.put("max_output_tokens", profile.getMaxOutputTokens());
        map.put("skill_ids", profile.getSkillIdsJson() == null ? List.of() : profile.getSkillIdsJson());
        map.put("is_system", profile.getIsSystem());
        List<Map<String, Object>> skills = resolvedSkills.stream()
            .map(AgentSkillPromptSupport::toMetadataMap)
            .toList();
        map.put("resolved_skills", skills);
        return map;
    }
}
