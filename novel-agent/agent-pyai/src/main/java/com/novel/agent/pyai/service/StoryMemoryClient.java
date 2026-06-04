package com.novel.agent.pyai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class StoryMemoryClient {

    private static final Logger log = LoggerFactory.getLogger(StoryMemoryClient.class);

    private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(15);

    private final WebClient contentClient;
    private final ObjectMapper objectMapper;

    public StoryMemoryClient(
        ObjectMapper objectMapper,
        @Value("${agent.content.base-url:http://127.0.0.1:8091}") String contentBaseUrl
    ) {
        this.objectMapper = objectMapper;
        this.contentClient = WebClient.builder().baseUrl(contentBaseUrl).build();
    }

    public Map<String, Object> loadMemory(Long userId, String novelId) {
        if (userId == null || userId <= 0 || novelId == null || novelId.isBlank()) {
            return emptyMemoryCopy();
        }
        try {
            return loadNovelMemoryBlocking(userId, novelId);
        } catch (Exception ex) {
            log.warn("load novel story memory failed userId={} novelId={}: {}", userId, novelId, ex.getMessage());
        }
        return emptyMemoryCopy();
    }

    public Map<String, Object> loadMemoryBySession(Long userId, String sessionId) {
        if (userId == null || userId <= 0 || sessionId == null || sessionId.isBlank()) {
            return emptyMemoryCopy();
        }
        try {
            return loadSessionMemoryBlocking(userId, sessionId);
        } catch (Exception ex) {
            log.warn("load session story memory failed userId={} sessionId={}: {}", userId, sessionId, ex.getMessage());
        }
        return emptyMemoryCopy();
    }

    public String renderForPrompt(Long userId, String novelId, int maxLen) {
        if (userId == null || userId <= 0 || novelId == null || novelId.isBlank()) {
            return "";
        }
        Map<String, Object> memory = loadMemory(userId, novelId);
        return renderMemoryText(memory, maxLen);
    }

    public Map<String, Object> patchMemory(
        Long userId,
        String novelId,
        Map<String, Object> payload
    ) {
        if (userId == null || userId <= 0 || novelId == null || novelId.isBlank()) {
            return Map.of("ok", false, "reason", "invalid user/novel");
        }
        try {
            return patchNovelMemoryBlocking(userId, novelId, payload);
        } catch (Exception ex) {
            log.warn("patch novel story memory failed userId={} novelId={}: {}", userId, novelId, ex.getMessage());
            return Map.of("ok", false, "reason", ex.getMessage());
        }
    }

    public Map<String, Object> deleteMemory(
        Long userId,
        String novelId,
        Map<String, Object> payload
    ) {
        if (userId == null || userId <= 0 || novelId == null || novelId.isBlank()) {
            return Map.of("ok", false, "reason", "invalid user/novel");
        }
        try {
            return deleteNovelMemoryBlocking(userId, novelId, payload);
        } catch (Exception ex) {
            log.warn("delete novel story memory failed userId={} novelId={}: {}", userId, novelId, ex.getMessage());
            return Map.of("ok", false, "reason", ex.getMessage());
        }
    }

    public Map<String, Object> clearMemoryScope(
        Long userId,
        String novelId,
        Map<String, Object> payload
    ) {
        if (userId == null || userId <= 0 || novelId == null || novelId.isBlank()) {
            return Map.of("ok", false, "reason", "invalid user/novel");
        }
        try {
            return clearNovelMemoryBlocking(userId, novelId, payload);
        } catch (Exception ex) {
            log.warn("clear novel story memory failed userId={} novelId={}: {}", userId, novelId, ex.getMessage());
            return Map.of("ok", false, "reason", ex.getMessage());
        }
    }

    private Map<String, Object> loadNovelMemoryBlocking(Long userId, String novelId) {
        Map<String, Object> body = contentClient.get()
            .uri("/api/content/novels/{novelId}/story-memory", novelId)
            .accept(MediaType.APPLICATION_JSON)
            .header("X-User-Id", Long.toString(userId))
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
            .timeout(HTTP_TIMEOUT)
            .block();
        return extractMemory(body);
    }

    private Map<String, Object> loadSessionMemoryBlocking(Long userId, String sessionId) {
        Map<String, Object> body = contentClient.get()
            .uri("/api/content/sessions/{sessionId}/story-memory", sessionId)
            .accept(MediaType.APPLICATION_JSON)
            .header("X-User-Id", Long.toString(userId))
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
            .timeout(HTTP_TIMEOUT)
            .block();
        return extractMemory(body);
    }

    private Map<String, Object> patchNovelMemoryBlocking(
        Long userId,
        String novelId,
        Map<String, Object> payload
    ) {
        Map<String, Object> body = contentClient.post()
            .uri("/api/content/novels/{novelId}/story-memory/patch", novelId)
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.APPLICATION_JSON)
            .header("X-User-Id", Long.toString(userId))
            .bodyValue(payload)
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
            .timeout(HTTP_TIMEOUT)
            .block();
        return body == null ? Map.of("ok", false, "reason", "empty response") : body;
    }

    private Map<String, Object> deleteNovelMemoryBlocking(
        Long userId,
        String novelId,
        Map<String, Object> payload
    ) {
        Map<String, Object> body = contentClient.post()
            .uri("/api/content/novels/{novelId}/story-memory/delete", novelId)
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.APPLICATION_JSON)
            .header("X-User-Id", Long.toString(userId))
            .bodyValue(payload)
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
            .timeout(HTTP_TIMEOUT)
            .block();
        return body == null ? Map.of("ok", false, "reason", "empty response") : body;
    }

    private Map<String, Object> clearNovelMemoryBlocking(
        Long userId,
        String novelId,
        Map<String, Object> payload
    ) {
        Map<String, Object> body = contentClient.post()
            .uri("/api/content/novels/{novelId}/story-memory/clear", novelId)
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.APPLICATION_JSON)
            .header("X-User-Id", Long.toString(userId))
            .bodyValue(payload)
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
            .timeout(HTTP_TIMEOUT)
            .block();
        return body == null ? Map.of("ok", false, "reason", "empty response") : body;
    }

    private Map<String, Object> extractMemory(Map<String, Object> body) {
        if (body == null) {
            return emptyMemoryCopy();
        }
        Object memory = body.get("memory");
        if (memory instanceof Map<?, ?> map) {
            return objectMapper.convertValue(map, new TypeReference<>() {});
        }
        return emptyMemoryCopy();
    }

    @SuppressWarnings("unchecked")
    private String renderMemoryText(Map<String, Object> memory, int maxLen) {
        StringBuilder sb = new StringBuilder();
        appendFlat(sb, "小说信息", (Map<String, Object>) memory.get("novel"), 160);
        appendFlat(sb, "世界观", (Map<String, Object>) memory.get("world"), 160);
        appendFlat(sb, "背景", (Map<String, Object>) memory.get("background"), 160);
        appendCharacterRoster(sb, (Map<String, Object>) memory.get("characters"));
        String text = sb.toString().trim();
        if (text.length() > maxLen) {
            return text.substring(0, maxLen) + "…";
        }
        return text;
    }

    private static void appendFlat(
        StringBuilder sb,
        String title,
        Map<String, Object> rows,
        int valueMax
    ) {
        if (rows == null || rows.isEmpty()) {
            return;
        }
        sb.append(title).append(":\n");
        int count = 0;
        for (Map.Entry<String, Object> entry : rows.entrySet()) {
            if (count >= 10) {
                break;
            }
            String value = String.valueOf(entry.getValue());
            if (value.length() > valueMax) {
                value = value.substring(0, valueMax) + "…";
            }
            sb.append("- ").append(entry.getKey()).append(": ").append(value).append('\n');
            count++;
        }
    }

    @SuppressWarnings("unchecked")
    private static void appendCharacterRoster(StringBuilder sb, Map<String, Object> groups) {
        if (groups == null || groups.isEmpty()) {
            return;
        }
        sb.append("角色库:\n");
        int count = 0;
        for (Map.Entry<String, Object> group : groups.entrySet()) {
            if (count >= 24) {
                break;
            }
            if (!(group.getValue() instanceof Map<?, ?> nested)) {
                continue;
            }
            String line = summarizeCharacter(String.valueOf(group.getKey()), (Map<String, Object>) nested);
            sb.append(line).append('\n');
            count++;
        }
    }

    private static String summarizeCharacter(String name, Map<String, Object> attrs) {
        String card = String.valueOf(attrs.getOrDefault("人物卡", "")).trim();
        String identity = String.valueOf(attrs.getOrDefault("身份", "")).trim();
        if (card.startsWith("{") && card.contains("\"身份\"")) {
            int start = card.indexOf("\"身份\"");
            int colon = card.indexOf(':', start);
            int quote = card.indexOf('"', colon + 1);
            int end = card.indexOf('"', quote + 1);
            if (quote >= 0 && end > quote) {
                identity = card.substring(quote + 1, end).trim();
            }
        }
        String ability = String.valueOf(attrs.getOrDefault("能力体系", "")).trim();
        if (ability.length() > 80) {
            ability = ability.substring(0, 80) + "…";
        }
        StringBuilder sb = new StringBuilder("- ").append(name);
        if (!identity.isBlank()) {
            sb.append(": ").append(identity);
        }
        if (!ability.isBlank()) {
            sb.append(" · ").append(ability);
        }
        return sb.toString();
    }

    private static void appendFlat(StringBuilder sb, String title, Map<String, Object> rows) {
        appendFlat(sb, title, rows, 160);
    }

    @SuppressWarnings("unchecked")
    private static void appendNested(StringBuilder sb, String title, Map<String, Object> groups) {
        appendCharacterRoster(sb, groups);
    }

    private static Map<String, Object> emptyMemoryCopy() {
        Map<String, Object> copy = new LinkedHashMap<>();
        copy.put("novel", new LinkedHashMap<>());
        copy.put("world", new LinkedHashMap<>());
        copy.put("characters", new LinkedHashMap<>());
        copy.put("chapters", new LinkedHashMap<>());
        copy.put("background", new LinkedHashMap<>());
        return copy;
    }
}
