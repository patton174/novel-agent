package cn.novelstudio.module.billing.integration.idatariver;

import com.fasterxml.jackson.databind.JsonNode;

/** 从 iDataRiver 订单 JSON 提取字段（独立站 / Open API 共用结构）。 */
public final class IdrOrderSnapshot {

    private IdrOrderSnapshot() {
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
