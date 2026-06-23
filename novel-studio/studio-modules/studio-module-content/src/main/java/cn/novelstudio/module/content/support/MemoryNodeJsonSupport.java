package cn.novelstudio.module.content.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

public final class MemoryNodeJsonSupport {

    private static final Logger log = LoggerFactory.getLogger(MemoryNodeJsonSupport.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private MemoryNodeJsonSupport() {
    }

    public static Map<String, Object> parseJsonMap(String json) {
        if (json == null || json.isBlank() || "null".equalsIgnoreCase(json.trim())) {
            return null;
        }
        try {
            return MAPPER.readValue(json, MAP_TYPE);
        } catch (Exception ex) {
            log.warn("memory json map parse failed: {}", ex.getMessage());
            return null;
        }
    }

    public static String sanitizeContent(String content) {
        if (content == null || content.isEmpty()) {
            return content;
        }
        return content.replace("\u0000", "");
    }
}
