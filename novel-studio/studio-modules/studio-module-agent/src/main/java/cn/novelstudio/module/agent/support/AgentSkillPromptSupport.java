package cn.novelstudio.module.agent.support;

import cn.novelstudio.module.content.entity.agent.AgentSkillEntity;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class AgentSkillPromptSupport {

    static final int SKILL_CONTENT_MAX_CHARS = 4000;

    private AgentSkillPromptSupport() {
    }

    public static Map<String, Object> toMetadataMap(AgentSkillEntity skill) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("id", skill.getId().toString());
        metadata.put("name", skill.getName());
        metadata.put("description", skill.getDescription());
        return metadata;
    }

    public static String mergePrompt(List<AgentSkillEntity> skills) {
        if (skills == null || skills.isEmpty()) {
            return "";
        }
        StringBuilder merged = new StringBuilder();
        for (AgentSkillEntity skill : skills) {
            merged.append("\n\n## Skill: ").append(skill.getName()).append("\n");
            merged.append(truncate(skill.getContent(), SKILL_CONTENT_MAX_CHARS));
        }
        return merged.toString().strip();
    }

    public static String truncate(String text, int maxChars) {
        if (text == null) {
            return "";
        }
        if (text.length() <= maxChars) {
            return text;
        }
        return text.substring(0, maxChars);
    }
}
