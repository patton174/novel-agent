package com.novel.agent.common.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.Map;

/**
 * 内层字段级加密载荷：字段名与值均 AES-GCM，由 Gateway 在传输层解密后展开。
 */
public final class FieldSecurePayload {

    public static final int VERSION = 1;
    public static final String MARKER = "__sec";

    private FieldSecurePayload() {
    }

    public static boolean looksSecure(ObjectMapper mapper, byte[] body) {
        if (body == null || body.length == 0) {
            return false;
        }
        try {
            JsonNode root = mapper.readTree(body);
            return root.has(MARKER) && root.path(MARKER).asInt(0) == VERSION && root.has("e");
        } catch (Exception ex) {
            return false;
        }
    }

    public static byte[] expand(ObjectMapper mapper, byte[] body, AesGcmCodec codec) throws Exception {
        JsonNode root = mapper.readTree(body);
        if (!looksSecure(mapper, body)) {
            return body;
        }
        ObjectNode out = mapper.createObjectNode();
        ArrayNode entries = (ArrayNode) root.get("e");
        if (entries == null) {
            return body;
        }
        for (JsonNode entry : entries) {
            String encKey = entry.path("k").asText(null);
            String encVal = entry.path("v").asText(null);
            if (encKey == null || encVal == null || encKey.isBlank() || encVal.isBlank()) {
                continue;
            }
            String fieldName = codec.decryptFieldPart(encKey);
            String valueJson = codec.decryptFieldPart(encVal);
            JsonNode valueNode = mapper.readTree(valueJson);
            mergeField(out, fieldName, valueNode);
        }
        return mapper.writeValueAsBytes(out);
    }

    private static void mergeField(ObjectNode out, String fieldName, JsonNode valueNode) {
        if (fieldName.contains(".")) {
            String[] parts = fieldName.split("\\.", 2);
            JsonNode child = out.get(parts[0]);
            ObjectNode childObj;
            if (child instanceof ObjectNode objectNode) {
                childObj = objectNode;
            } else {
                childObj = out.objectNode();
                out.set(parts[0], childObj);
            }
            mergeField(childObj, parts[1], valueNode);
            return;
        }
        out.set(fieldName, valueNode);
    }

    public static byte[] compact(ObjectMapper mapper, Map<String, Object> plain, AesGcmCodec codec) throws Exception {
        ObjectNode root = mapper.createObjectNode();
        root.put(MARKER, VERSION);
        ArrayNode entries = mapper.createArrayNode();
        for (Map.Entry<String, Object> e : plain.entrySet()) {
            ObjectNode item = mapper.createObjectNode();
            item.put("k", codec.encryptFieldPart(e.getKey()));
            String valueJson = mapper.writeValueAsString(e.getValue());
            item.put("v", codec.encryptFieldPart(valueJson));
            entries.add(item);
        }
        root.set("e", entries);
        return mapper.writeValueAsBytes(root);
    }
}
