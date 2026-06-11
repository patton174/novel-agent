package cn.novelstudio.module.content.service;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Formats story-memory entries for Agent VFS Read (aligned with Python memory_document v1).
 */
final class StoryMemoryAgentReadFormatter {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Pattern CHAPTER_UUID =
        Pattern.compile("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", Pattern.CASE_INSENSITIVE);
    private static final Pattern SUMMARY_HEADING =
        Pattern.compile("^#\\s*(第\\s*\\d+\\s*章[^\\n#]+)", Pattern.MULTILINE);
    private static final Pattern BOOK_TITLE = Pattern.compile("《([^》]+)》");

    private StoryMemoryAgentReadFormatter() {}

    static String format(
        Map<String, Object> memory,
        String scope,
        String key,
        String itemId
    ) {
        String scopeNorm = StoryMemoryService.normalizeScope(scope);
        String keyNorm = key == null ? "" : key.trim();
        String itemNorm = itemId == null ? "" : itemId.trim();

        return switch (scopeNorm) {
            case "character" -> formatCharacter(memory, keyNorm, itemNorm);
            case "chapter" -> formatChapterMemory(memory, keyNorm, itemNorm);
            case "world" -> formatFlat(memory, "world", keyNorm, itemNorm);
            case "background" -> formatFlat(memory, "background", keyNorm, itemNorm);
            default -> formatFlat(memory, "novel", keyNorm, itemNorm);
        };
    }

    static String scopeDisplayLabel(String scopeNorm) {
        return switch (scopeNorm) {
            case "world" -> "世界观";
            case "background" -> "背景设定";
            case "character" -> "角色库";
            case "chapter" -> "章节记忆";
            default -> "作品设定";
        };
    }

    private static String formatCharacter(
        Map<String, Object> memory,
        String key,
        String itemId
    ) {
        @SuppressWarnings("unchecked")
        Map<String, Map<String, String>> characters = castNestedStringMap(memory.get("characters"));
        if (characters.isEmpty()) {
            return "# 角色库\n\n（空）";
        }
        String bucketId = resolveCharacterId(characters, key, itemId);
        if (bucketId == null || bucketId.isBlank()) {
            StringBuilder roster = new StringBuilder("# 角色库\n\n");
            roster.append("共 ").append(characters.size()).append(" 人：");
            roster.append(String.join("、", characters.keySet()));
            roster.append("\n\n");
            for (Map.Entry<String, Map<String, String>> e : characters.entrySet()) {
                roster.append("- ").append(e.getKey()).append("\n");
            }
            return roster.toString().stripTrailing();
        }
        Map<String, String> card = characters.getOrDefault(bucketId, Map.of());
        if (!key.isBlank() && !"*".equals(key) && !isKnownCharacterFieldKey(key)) {
            String field = key;
            if (!card.containsKey(field)) {
                return "# 角色库 · " + bucketId + "\n\n（字段不存在: " + field + "）";
            }
            return header(scopeDisplayLabel("character"), bucketId, bucketId)
                + "\n\n**" + field + "**\n\n"
                + card.get(field);
        }
        return formatEnvelopeLike(
            scopeDisplayLabel("character"),
            bucketId,
            bucketId,
            card
        );
    }

    private static String formatChapterMemory(
        Map<String, Object> memory,
        String key,
        String itemId
    ) {
        @SuppressWarnings("unchecked")
        Map<String, Map<String, String>> chapters = castNestedStringMap(memory.get("chapters"));
        String bucketId = itemId.isBlank() ? key : itemId;
        if (bucketId.isBlank()) {
            StringBuilder sb = new StringBuilder("# 章节记忆\n\n");
            for (String id : chapters.keySet()) {
                sb.append("- ").append(id).append("\n");
            }
            return sb.toString().stripTrailing();
        }
        Map<String, String> entry = chapters.getOrDefault(bucketId, Map.of());
        String displayTitle = resolveChapterMemoryTitle(entry, bucketId);
        if (!key.isBlank() && !"*".equals(key) && entry.containsKey(key)) {
            return header(scopeDisplayLabel("chapter"), bucketId, displayTitle)
                + "\n\n**" + key + "**\n\n"
                + entry.get(key);
        }
        return formatEnvelopeLike(
            scopeDisplayLabel("chapter"),
            bucketId,
            displayTitle,
            entry
        );
    }

    private static String formatFlat(
        Map<String, Object> memory,
        String bucketName,
        String key,
        String itemId
    ) {
        @SuppressWarnings("unchecked")
        Map<String, String> rows = castStringMap(memory.get(bucketName));
        String resolvedKey = resolveFlatKey(rows, key, itemId);
        if (resolvedKey == null || resolvedKey.isBlank()) {
            StringBuilder sb = new StringBuilder("# ").append(scopeDisplayLabel(bucketName)).append("\n\n");
            for (String k : rows.keySet()) {
                sb.append("- ").append(k).append("\n");
            }
            return sb.toString().stripTrailing();
        }
        String raw = rows.getOrDefault(resolvedKey, "");
        if (looksLikeV1Json(raw)) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> env = MAPPER.readValue(raw, Map.class);
                return formatEnvelopeFromJson(scopeDisplayLabel(bucketName), resolvedKey, env);
            } catch (Exception ignored) {
                // fall through
            }
        }
        return header(scopeDisplayLabel(bucketName), resolvedKey, resolvedKey)
            + "\n\n"
            + raw;
    }

    private static String formatEnvelopeLike(
        String scopeLabel,
        String entryId,
        String title,
        Map<String, String> fields
    ) {
        Map<String, Object> data = new LinkedHashMap<>();
        for (Map.Entry<String, String> e : fields.entrySet()) {
            data.put(e.getKey(), e.getValue());
        }
        Map<String, Object> env = new LinkedHashMap<>();
        env.put("v", 1);
        env.put("title", title);
        env.put("summary", fields.getOrDefault("摘要", fields.getOrDefault("summary", "")));
        env.put("data", data);
        return formatEnvelopeFromJson(scopeLabel, entryId, env);
    }

    private static String formatEnvelopeFromJson(
        String scopeLabel,
        String entryId,
        Map<String, Object> envelope
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append("# 记忆文档 v1\n");
        sb.append("- scope: ").append(scopeLabel).append('\n');
        sb.append("- id: ").append(entryId).append('\n');
        Object title = envelope.get("title");
        if (title != null && !String.valueOf(title).isBlank()) {
            sb.append("- title: ").append(title).append('\n');
        }
        Object summary = envelope.get("summary");
        if (summary != null && !String.valueOf(summary).isBlank()) {
            sb.append("- summary: ").append(String.valueOf(summary).trim()).append('\n');
        }
        sb.append('\n');

        Object dataObj = envelope.get("data");
        if (dataObj instanceof Map<?, ?> dataMap) {
            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) dataMap;
            String body = extractBodyMarkdown(data);
            if (!body.isBlank()) {
                sb.append("---\n\n");
                sb.append(body.strip());
                return sb.toString();
            }
            boolean wroteField = false;
            for (Map.Entry<String, Object> entry : data.entrySet()) {
                String fieldKey = String.valueOf(entry.getKey()).trim();
                if (fieldKey.isBlank() || "body".equals(fieldKey) || "正文".equals(fieldKey)) {
                    continue;
                }
                String value = String.valueOf(entry.getValue() == null ? "" : entry.getValue()).trim();
                if (value.isBlank()) {
                    continue;
                }
                sb.append("## ").append(fieldKey).append("\n\n");
                sb.append(value).append("\n\n");
                wroteField = true;
            }
            if (wroteField) {
                return sb.toString().stripTrailing();
            }
        }

        try {
            sb.append(MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(envelope));
        } catch (Exception ex) {
            sb.append(String.valueOf(envelope));
        }
        return sb.toString();
    }

    private static String extractBodyMarkdown(Map<String, Object> data) {
        if (data == null || data.isEmpty()) {
            return "";
        }
        for (String key : List.of("body", "正文", "content")) {
            Object raw = data.get(key);
            if (raw != null && !String.valueOf(raw).isBlank()) {
                return String.valueOf(raw);
            }
        }
        return "";
    }

    private static String header(String scopeLabel, String entryKey, String entryTitle) {
        return "# " + scopeLabel + " · " + entryTitle + "\n- entry: " + entryKey;
    }

    private static boolean looksLikeV1Json(String raw) {
        String t = raw == null ? "" : raw.trim();
        return t.startsWith("{") && t.contains("\"v\"");
    }

    private static String resolveFlatKey(
        Map<String, String> rows,
        String key,
        String itemId
    ) {
        if (!itemId.isBlank() && rows.containsKey(itemId)) {
            return itemId;
        }
        if (!key.isBlank() && !"*".equals(key) && rows.containsKey(key)) {
            return key;
        }
        return null;
    }

    private static String resolveCharacterId(
        Map<String, Map<String, String>> characters,
        String key,
        String itemId
    ) {
        if (!itemId.isBlank() && characters.containsKey(itemId)) {
            return itemId;
        }
        if (!key.isBlank() && !"*".equals(key) && characters.containsKey(key)) {
            return key;
        }
        if (!key.isBlank() && !isKnownCharacterFieldKey(key) && characters.containsKey(key)) {
            return key;
        }
        return null;
    }

    private static boolean isKnownCharacterFieldKey(String key) {
        return List.of("身份", "性格", "外貌", "能力", "人物卡").contains(key);
    }

    private static String resolveChapterMemoryTitle(Map<String, String> entry, String bucketId) {
        String fromTitle = entry.getOrDefault("title", "").trim();
        if (!fromTitle.isBlank() && !CHAPTER_UUID.matcher(fromTitle).matches()) {
            return fromTitle;
        }
        String summary = entry.getOrDefault("摘要", entry.getOrDefault("summary", "")).trim();
        if (!summary.isBlank()) {
            Matcher heading = SUMMARY_HEADING.matcher(summary);
            if (heading.find()) {
                return heading.group(1).trim().replaceAll("\\s*摘要\\s*$", "");
            }
            Matcher book = BOOK_TITLE.matcher(summary);
            if (book.find()) {
                return "《" + book.group(1) + "》";
            }
        }
        return bucketId;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, String> castStringMap(Object raw) {
        if (!(raw instanceof Map<?, ?> map)) {
            return Map.of();
        }
        Map<String, String> out = new LinkedHashMap<>();
        for (Map.Entry<?, ?> e : map.entrySet()) {
            out.put(String.valueOf(e.getKey()), String.valueOf(e.getValue()));
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Map<String, String>> castNestedStringMap(Object raw) {
        if (!(raw instanceof Map<?, ?> map)) {
            return Map.of();
        }
        Map<String, Map<String, String>> out = new LinkedHashMap<>();
        for (Map.Entry<?, ?> e : map.entrySet()) {
            if (e.getValue() instanceof Map<?, ?> inner) {
                Map<String, String> row = new LinkedHashMap<>();
                for (Map.Entry<?, ?> ie : inner.entrySet()) {
                    row.put(String.valueOf(ie.getKey()), String.valueOf(ie.getValue()));
                }
                out.put(String.valueOf(e.getKey()), row);
            }
        }
        return out;
    }
}
