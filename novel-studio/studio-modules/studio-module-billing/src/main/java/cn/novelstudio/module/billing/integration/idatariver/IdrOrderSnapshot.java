package cn.novelstudio.module.billing.integration.idatariver;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;

/** 从 iDataRiver 订单 JSON 提取字段（独立站 / Open API 共用结构）。 */
public final class IdrOrderSnapshot {

    private IdrOrderSnapshot() {
    }

    /** createdTS + expiredInterval（秒） */
    public static Instant expiresAt(JsonNode remote) {
        if (remote == null || remote.isMissingNode()) {
            return null;
        }
        Long createdMs = parseEpochMillis(remote.path("createdTS"));
        if (createdMs == null) {
            createdMs = parseEpochMillis(remote.path("createdAt"));
        }
        JsonNode intervalNode = remote.path("expiredInterval");
        if (createdMs == null || !intervalNode.isNumber()) {
            return null;
        }
        long intervalSec = intervalNode.asLong();
        if (intervalSec <= 0) {
            return null;
        }
        return Instant.ofEpochMilli(createdMs + intervalSec * 1000L);
    }

    private static Long parseEpochMillis(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        if (node.isNumber()) {
            long value = node.asLong();
            return value < 1_000_000_000_000L ? value * 1000L : value;
        }
        String text = node.asText(null);
        if (text == null || text.isBlank()) {
            return null;
        }
        try {
            long value = Long.parseLong(text.trim());
            return value < 1_000_000_000_000L ? value * 1000L : value;
        } catch (NumberFormatException ignored) {
            try {
                return Instant.parse(text.trim()).toEpochMilli();
            } catch (Exception ex) {
                return null;
            }
        }
    }

    public static String contactInfo(JsonNode remote) {
        return text(remote, "contactInfo");
    }

    public static String skuId(JsonNode remote) {
        String nested = text(remote.path("sku"), "id");
        if (nested != null) {
            return nested;
        }
        return text(remote, "skuId");
    }

    public static String projectId(JsonNode remote) {
        String nested = text(remote.path("project"), "id");
        if (nested != null) {
            return nested;
        }
        return text(remote, "projectId");
    }

    private static String text(JsonNode node, String field) {
        if (node == null || node.isMissingNode()) {
            return null;
        }
        JsonNode v = node.path(field);
        if (v.isMissingNode() || v.isNull()) {
            return null;
        }
        String s = v.asText();
        return s == null || s.isBlank() ? null : s.trim();
    }
}
