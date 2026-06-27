package cn.novelstudio.module.content.support;

import cn.novelstudio.module.content.entity.agent.AgentSkillEntity;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class AgentSkillPromptSupport {

    static final int SKILL_CONTENT_MAX_CHARS = 4000;
    static final int MAX_LISTING_DESC_CHARS = 250;
    static final int DEFAULT_CATALOG_CHAR_BUDGET = 8000;

    private AgentSkillPromptSupport() {
    }

    public static Map<String, Object> toMetadataMap(AgentSkillEntity skill) {
        return toMetadataMap(skill, !Boolean.FALSE.equals(skill.getEnabled()), false);
    }

    public static Map<String, Object> toMetadataMap(
        AgentSkillEntity skill,
        boolean enabled,
        boolean userSpecified
    ) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("id", skill.getId().toString());
        metadata.put("name", skill.getName());
        metadata.put("description", skill.getDescription());
        metadata.put("version", skill.getVersion() == null ? 1 : skill.getVersion());
        metadata.put("is_system", Boolean.TRUE.equals(skill.getIsSystem()));
        metadata.put("enabled", enabled);
        if (userSpecified) {
            metadata.put("user_specified", true);
        }
        return metadata;
    }

    /** Write skills metadata (+ optional eager prompt) into assembled run context. */
    public static void applyRunSkills(
        Map<String, Object> context,
        List<Map<String, Object>> skills,
        String skillPrompt,
        boolean userSpecified
    ) {
        if (skills == null || skills.isEmpty()) {
            return;
        }
        context.put("skills", skills);
        if (userSpecified && skillPrompt != null && !skillPrompt.isBlank()) {
            context.put("skill_prompt", skillPrompt);
            context.put("skills_user_specified", true);
        }
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

    /** CC-style discovery catalog — metadata only, no skill body. */
    public static String formatCatalog(List<AgentSkillEntity> skills) {
        return formatCatalogFromMetadata(
            skills == null ? List.of() : skills.stream().map(AgentSkillPromptSupport::toMetadataMap).toList()
        );
    }

    public static String formatCatalogFromMetadata(List<Map<String, Object>> skills) {
        if (skills == null || skills.isEmpty()) {
            return "";
        }
        StringBuilder lines = new StringBuilder();
        for (Map<String, Object> row : skills) {
            if (row == null) {
                continue;
            }
            String name = row.get("name") == null ? "" : String.valueOf(row.get("name")).trim();
            if (name.isEmpty()) {
                continue;
            }
            String desc = row.get("description") == null ? "" : String.valueOf(row.get("description")).trim();
            if (desc.length() > MAX_LISTING_DESC_CHARS) {
                desc = desc.substring(0, MAX_LISTING_DESC_CHARS - 1) + "…";
            }
            if (lines.length() > 0) {
                lines.append('\n');
            }
            lines.append("- ").append(name);
            if (!desc.isEmpty()) {
                lines.append(": ").append(desc);
            }
        }
        String full = lines.toString();
        if (full.length() <= DEFAULT_CATALOG_CHAR_BUDGET) {
            return full;
        }
        StringBuilder compact = new StringBuilder();
        for (Map<String, Object> row : skills) {
            if (row == null) {
                continue;
            }
            String name = row.get("name") == null ? "" : String.valueOf(row.get("name")).trim();
            if (name.isEmpty()) {
                continue;
            }
            if (compact.length() > 0) {
                compact.append('\n');
            }
            compact.append("- ").append(name);
        }
        return compact.toString();
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
