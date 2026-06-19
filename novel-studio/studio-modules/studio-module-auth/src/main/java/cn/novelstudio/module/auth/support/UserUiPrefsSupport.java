package cn.novelstudio.module.auth.support;

import cn.novelstudio.module.auth.service.auth.req.PixelAvatarPrefsReq;
import cn.novelstudio.module.auth.service.auth.resp.PixelAvatarPrefsResp;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class UserUiPrefsSupport {

    private static final String KEY_PIXEL_AVATAR = "pixelAvatar";

    private final ObjectMapper objectMapper;

    public UserUiPrefsSupport(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public PixelAvatarPrefsResp readPixelAvatar(String uiPrefsJson) {
        if (uiPrefsJson == null || uiPrefsJson.isBlank()) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(uiPrefsJson);
            JsonNode node = root.path(KEY_PIXEL_AVATAR);
            if (node.isMissingNode() || node.isNull()) {
                return null;
            }
            String style = textOrNull(node, "style");
            String presetId = textOrNull(node, "presetId");
            Map<String, String> customColors = readColorMap(node.path("customColors"));
            if (style == null && presetId == null && customColors.isEmpty()) {
                return null;
            }
            return new PixelAvatarPrefsResp(style, presetId, customColors);
        } catch (Exception ignored) {
            return null;
        }
    }

    public String mergePixelAvatar(String uiPrefsJson, PixelAvatarPrefsReq req) {
        ObjectNode root;
        try {
            if (uiPrefsJson == null || uiPrefsJson.isBlank()) {
                root = objectMapper.createObjectNode();
            } else {
                JsonNode parsed = objectMapper.readTree(uiPrefsJson);
                root = parsed.isObject() ? (ObjectNode) parsed : objectMapper.createObjectNode();
            }
            ObjectNode avatar = objectMapper.createObjectNode();
            if (req.style() != null) {
                avatar.put("style", req.style());
            }
            if (req.presetId() != null) {
                avatar.put("presetId", req.presetId());
            }
            if (req.customColors() != null && !req.customColors().isEmpty()) {
                ObjectNode colors = objectMapper.createObjectNode();
                req.customColors().forEach((k, v) -> {
                    if (v != null) {
                        colors.put(k, v);
                    }
                });
                avatar.set("customColors", colors);
            }
            root.set(KEY_PIXEL_AVATAR, avatar);
            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize ui prefs", e);
        }
    }

    private static String textOrNull(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        String text = value.asText(null);
        return text == null || text.isBlank() ? null : text;
    }

    private static Map<String, String> readColorMap(JsonNode node) {
        Map<String, String> out = new LinkedHashMap<>();
        if (node == null || !node.isObject()) {
            return out;
        }
        node.fields().forEachRemaining(entry -> {
            if (entry.getValue().isTextual()) {
                out.put(entry.getKey(), entry.getValue().asText());
            }
        });
        return out;
    }
}
