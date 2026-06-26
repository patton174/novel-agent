package cn.novelstudio.module.billing.service;

import cn.novelstudio.module.billing.dto.idr.IdrCouponCreateReq;
import cn.novelstudio.module.billing.dto.idr.IdrCouponItemResp;
import cn.novelstudio.module.billing.dto.idr.IdrCouponUpdateReq;
import cn.novelstudio.module.billing.dto.idr.IdrMerchantBasicResp;
import cn.novelstudio.module.billing.dto.idr.IdrPricingCreateReq;
import cn.novelstudio.module.billing.dto.idr.IdrPricingItemResp;
import cn.novelstudio.module.billing.dto.idr.IdrPricingUpdateReq;
import cn.novelstudio.module.billing.dto.idr.IdrProjectDetailResp;
import cn.novelstudio.module.billing.dto.idr.IdrProjectItemResp;
import cn.novelstudio.module.billing.dto.idr.IdrProjectListResp;
import cn.novelstudio.module.billing.dto.idr.IdrSkuCreateReq;
import cn.novelstudio.module.billing.dto.idr.IdrSkuDetailResp;
import cn.novelstudio.module.billing.dto.idr.IdrSkuInventoryUpdateReq;
import cn.novelstudio.module.billing.dto.idr.IdrSkuItemResp;
import cn.novelstudio.module.billing.dto.idr.IdrSkuUpdateReq;
import cn.novelstudio.module.billing.integration.idatariver.IDataRiverClient;
import cn.novelstudio.module.billing.support.IdrCdkGenerator;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class IdrCatalogBiz {

    private static final int MAX_STOCK_BATCH = 500;

    private final IDataRiverClient idataRiverClient;

    public IdrMerchantBasicResp merchantBasic() {
        requireConfigured();
        JsonNode node = idataRiverClient.getMerchantBasicInfo();
        return new IdrMerchantBasicResp(text(node, "name"), text(node, "desc"));
    }

    public IdrProjectListResp listProjects() {
        requireConfigured();
        JsonNode root = idataRiverClient.listProjects();
        JsonNode projects = root.path("projects");
        if (!projects.isArray()) {
            return new IdrProjectListResp(List.of());
        }
        List<IdrProjectItemResp> items = new ArrayList<>();
        for (JsonNode node : projects) {
            IdrProjectItemResp item = toProjectItem(node);
            if (item.id() != null && !item.id().isBlank()) {
                items.add(item);
            }
        }
        items.sort(Comparator.comparing(IdrProjectItemResp::name, String.CASE_INSENSITIVE_ORDER));
        return new IdrProjectListResp(items);
    }

    public IdrProjectDetailResp projectDetail(String projectId) {
        requireConfigured();
        if (projectId == null || projectId.isBlank()) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.project_id_required");
        }
        JsonNode root = idataRiverClient.getProjectDetail(projectId.trim());
        IdrProjectItemResp project = toProjectItem(root);
        return new IdrProjectDetailResp(
            project,
            parseSkus(root.path("skus")),
            parsePricings(root.path("pricings")),
            parseCoupons(root.path("coupons"))
        );
    }

    public IdrSkuDetailResp skuDetail(String skuId) {
        requireConfigured();
        if (skuId == null || skuId.isBlank()) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.sku_id_required");
        }
        JsonNode root = idataRiverClient.getSkuDetail(skuId.trim());
        return toSkuDetail(root);
    }

    public IdrSkuDetailResp updateSkuInventory(String skuId, IdrSkuInventoryUpdateReq req) {
        requireConfigured();
        if (skuId == null || skuId.isBlank()) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.sku_id_required");
        }
        if (req == null) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.request_required");
        }
        String trimmedSkuId = skuId.trim();
        JsonNode current = idataRiverClient.getSkuDetail(trimmedSkuId);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", trimmedSkuId);

        List<String> incoming = resolveIncomingItems(req, current);
        if (!incoming.isEmpty()) {
            List<String> merged;
            if ("replace".equalsIgnoreCase(req.mode())) {
                merged = incoming;
            } else {
                merged = new ArrayList<>(parseItems(current.path("items")));
                merged.addAll(incoming);
            }
            body.put("itemType", "consumable");
            body.put("items", merged);
        }
        if (req.status() != null && !req.status().isBlank()) {
            body.put("status", req.status().trim().toUpperCase());
        }
        if (body.size() <= 1) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.inventory_update_required");
        }
        idataRiverClient.updateSku(body);
        return skuDetail(trimmedSkuId);
    }

    public IdrSkuItemResp createSku(String projectId, IdrSkuCreateReq req) {
        requireConfigured();
        String pid = requireProjectId(projectId);
        if (req == null || req.name() == null || req.name().isBlank()) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.sku_name_required");
        }
        JsonNode added = idataRiverClient.addSku(pid);
        String skuId = text(added, "id");
        if (skuId == null || skuId.isBlank()) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.sku_create_failed");
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", skuId.trim());
        body.put("name", req.name().trim());
        body.put("status", normalizeStatus(req.status()));
        if (req.quantity() != null && req.quantity() > 0) {
            int qty = req.quantity();
            if (qty > MAX_STOCK_BATCH) {
                throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.stock_batch_max", MAX_STOCK_BATCH);
            }
            body.put("itemType", "consumable");
            body.put("items", IdrCdkGenerator.generate(qty));
        }
        idataRiverClient.updateSku(body);
        JsonNode detail = idataRiverClient.getSkuDetail(skuId.trim());
        return toSkuItem(detail);
    }

    public IdrSkuItemResp updateSku(String skuId, IdrSkuUpdateReq req) {
        requireConfigured();
        if (skuId == null || skuId.isBlank()) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.sku_id_required");
        }
        if (req == null) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.request_required");
        }
        String trimmedSkuId = skuId.trim();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", trimmedSkuId);
        if (req.name() != null && !req.name().isBlank()) {
            body.put("name", req.name().trim());
        }
        if (req.status() != null && !req.status().isBlank()) {
            body.put("status", normalizeStatus(req.status()));
        }
        if (body.size() <= 1) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.update_fields_required");
        }
        idataRiverClient.updateSku(body);
        return toSkuItem(idataRiverClient.getSkuDetail(trimmedSkuId));
    }

    public IdrPricingItemResp createPricing(String projectId, IdrPricingCreateReq req) {
        requireConfigured();
        String pid = requireProjectId(projectId);
        if (req == null) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.request_required");
        }
        String policy = normalizePricingPolicy(req.policy());
        String scope = normalizeScope(req.scope());
        if ("fixed".equals(policy) && (req.price() == null || req.price().isBlank())) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.pricing_fixed_price_required");
        }
        if ("specific".equals(scope) && (req.scopeItems() == null || req.scopeItems().isEmpty())) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.scope_sku_required");
        }
        JsonNode added = idataRiverClient.addPricing(pid);
        String pricingId = text(added, "id");
        if (pricingId == null || pricingId.isBlank()) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.pricing_create_failed");
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", pricingId.trim());
        body.put("status", normalizeStatus(req.status()));
        body.put("scope", scope);
        body.put("policy", policy);
        if ("fixed".equals(policy)) {
            body.put("price", req.price().trim());
        }
        if ("specific".equals(scope)) {
            body.put("scopeItems", req.scopeItems());
        }
        JsonNode updated = idataRiverClient.updatePricing(body);
        return toPricingItem(updated.isMissingNode() || updated.isNull() ? added : updated, pricingId.trim());
    }

    public IdrPricingItemResp updatePricing(String pricingId, IdrPricingUpdateReq req) {
        requireConfigured();
        if (pricingId == null || pricingId.isBlank()) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.pricing_id_required");
        }
        if (req == null) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.request_required");
        }
        String trimmedId = pricingId.trim();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", trimmedId);
        if (req.status() != null && !req.status().isBlank()) {
            body.put("status", normalizeStatus(req.status()));
        }
        if (req.price() != null && !req.price().isBlank()) {
            body.put("price", req.price().trim());
        }
        if (body.size() <= 1) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.update_fields_required");
        }
        JsonNode updated = idataRiverClient.updatePricing(body);
        return toPricingItem(updated, trimmedId);
    }

    public IdrCouponItemResp createCoupon(String projectId, IdrCouponCreateReq req) {
        requireConfigured();
        String pid = requireProjectId(projectId);
        if (req == null) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.request_required");
        }
        String policy = normalizeCouponPolicy(req.policy());
        String scope = normalizeScope(req.scope());
        if ("specific".equals(scope) && (req.scopeItems() == null || req.scopeItems().isEmpty())) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.scope_sku_required");
        }
        validateCouponPolicyValues(policy, req);
        JsonNode added = idataRiverClient.addCoupon(pid);
        String couponId = text(added, "id");
        if (couponId == null || couponId.isBlank()) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.coupon_create_failed");
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", couponId.trim());
        body.put("status", normalizeStatus(req.status()));
        body.put("scope", scope);
        body.put("policy", policy);
        if ("specific".equals(scope)) {
            body.put("scopeItems", req.scopeItems());
        }
        if ("reduction".equals(policy) && req.reduction() != null) {
            body.put("reduction", req.reduction());
        }
        if ("fixed".equals(policy) && req.fixed() != null) {
            body.put("fixed", req.fixed());
        }
        if ("discount".equals(policy) && req.discount() != null) {
            body.put("discount", req.discount());
            if (req.capped() != null) {
                body.put("capped", req.capped());
            }
        }
        JsonNode updated = idataRiverClient.updateCoupon(body);
        return toCouponItem(updated.isMissingNode() || updated.isNull() ? added : updated, couponId.trim());
    }

    public IdrCouponItemResp updateCoupon(String couponId, IdrCouponUpdateReq req) {
        requireConfigured();
        if (couponId == null || couponId.isBlank()) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.coupon_id_required");
        }
        if (req == null || req.status() == null || req.status().isBlank()) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.update_fields_required");
        }
        String trimmedId = couponId.trim();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", trimmedId);
        body.put("status", normalizeStatus(req.status()));
        JsonNode updated = idataRiverClient.updateCoupon(body);
        return toCouponItem(updated, trimmedId);
    }

    private List<IdrSkuItemResp> parseSkus(JsonNode skus) {
        if (!skus.isArray()) {
            return List.of();
        }
        List<IdrSkuItemResp> items = new ArrayList<>();
        for (JsonNode node : skus) {
            String id = text(node, "id");
            if (id == null || id.isBlank()) {
                continue;
            }
            items.add(new IdrSkuItemResp(
                id,
                text(node, "name"),
                text(node, "status"),
                intOrNull(node, "stock"),
                text(node, "itemType"),
                intOrNull(node, "sold"),
                intOrNull(node, "itemsNum")
            ));
        }
        items.sort(Comparator.comparing(IdrSkuItemResp::name, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)));
        return items;
    }

    private List<IdrPricingItemResp> parsePricings(JsonNode pricings) {
        if (!pricings.isArray()) {
            return List.of();
        }
        List<IdrPricingItemResp> items = new ArrayList<>();
        for (JsonNode node : pricings) {
            String id = text(node, "id");
            if (id == null || id.isBlank()) {
                continue;
            }
            items.add(new IdrPricingItemResp(
                id,
                text(node, "status"),
                text(node, "scope"),
                text(node, "policy"),
                doubleOrNull(node, "price")
            ));
        }
        return items;
    }

    private List<IdrCouponItemResp> parseCoupons(JsonNode coupons) {
        if (!coupons.isArray()) {
            return List.of();
        }
        List<IdrCouponItemResp> items = new ArrayList<>();
        for (JsonNode node : coupons) {
            String id = text(node, "id");
            if (id == null || id.isBlank()) {
                continue;
            }
            items.add(new IdrCouponItemResp(
                id,
                text(node, "status"),
                text(node, "code"),
                text(node, "policy"),
                text(node, "scope")
            ));
        }
        return items;
    }

    private static IdrSkuDetailResp toSkuDetail(JsonNode node) {
        return new IdrSkuDetailResp(
            text(node, "id"),
            text(node, "name"),
            text(node, "status"),
            intOrNull(node, "stock"),
            text(node, "itemType"),
            intOrNull(node, "itemsNum"),
            intOrNull(node, "sold"),
            boolOrNull(node, "hiddenStock"),
            text(node, "project"),
            List.of()
        );
    }

    private static List<String> resolveIncomingItems(IdrSkuInventoryUpdateReq req, JsonNode current) {
        if (req.quantity() != null && req.quantity() > 0) {
            int qty = req.quantity();
            if (qty > MAX_STOCK_BATCH) {
                throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.stock_batch_max", MAX_STOCK_BATCH);
            }
            return IdrCdkGenerator.generate(qty);
        }
        if (req.items() != null && !req.items().isEmpty()) {
            return normalizeItems(req.items());
        }
        return List.of();
    }

    private static List<String> parseItems(JsonNode itemsNode) {
        if (!itemsNode.isArray()) {
            return List.of();
        }
        List<String> items = new ArrayList<>();
        for (JsonNode node : itemsNode) {
            if (node.isNull()) {
                continue;
            }
            String value = node.asText().trim();
            if (!value.isBlank()) {
                items.add(value);
            }
        }
        return items;
    }

    private static List<String> normalizeItems(List<String> raw) {
        Set<String> seen = new LinkedHashSet<>();
        List<String> out = new ArrayList<>();
        for (String line : raw) {
            if (line == null) {
                continue;
            }
            String trimmed = line.trim();
            if (trimmed.isBlank() || !seen.add(trimmed)) {
                continue;
            }
            out.add(trimmed);
        }
        return out;
    }

    private static Boolean boolOrNull(JsonNode node, String field) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        JsonNode v = node.path(field);
        if (v.isMissingNode() || v.isNull()) {
            return null;
        }
        return v.asBoolean();
    }

    private static IdrProjectItemResp toProjectItem(JsonNode node) {
        return new IdrProjectItemResp(
            text(node, "id"),
            text(node, "name"),
            text(node, "status"),
            text(node, "type"),
            text(node, "slug"),
            text(node, "desc")
        );
    }

    private static IdrSkuItemResp toSkuItem(JsonNode node) {
        return new IdrSkuItemResp(
            text(node, "id"),
            text(node, "name"),
            text(node, "status"),
            intOrNull(node, "stock"),
            text(node, "itemType"),
            intOrNull(node, "sold"),
            intOrNull(node, "itemsNum")
        );
    }

    private static IdrPricingItemResp toPricingItem(JsonNode node, String fallbackId) {
        String id = text(node, "id");
        if (id == null || id.isBlank()) {
            id = fallbackId;
        }
        return new IdrPricingItemResp(
            id,
            text(node, "status"),
            text(node, "scope"),
            text(node, "policy"),
            doubleOrNull(node, "price")
        );
    }

    private static IdrCouponItemResp toCouponItem(JsonNode node, String fallbackId) {
        String id = text(node, "id");
        if (id == null || id.isBlank()) {
            id = fallbackId;
        }
        return new IdrCouponItemResp(
            id,
            text(node, "status"),
            text(node, "code"),
            text(node, "policy"),
            text(node, "scope")
        );
    }

    private static String requireProjectId(String projectId) {
        if (projectId == null || projectId.isBlank()) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.project_id_required");
        }
        return projectId.trim();
    }

    private static String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "ONLINE";
        }
        return status.trim().toUpperCase();
    }

    private static String normalizeScope(String scope) {
        if (scope == null || scope.isBlank()) {
            return "global";
        }
        String normalized = scope.trim().toLowerCase();
        if ("globle".equals(normalized)) {
            return "global";
        }
        return normalized;
    }

    private static String normalizePricingPolicy(String policy) {
        if (policy == null || policy.isBlank()) {
            return "fixed";
        }
        return policy.trim().toLowerCase();
    }

    private static String normalizeCouponPolicy(String policy) {
        if (policy == null || policy.isBlank()) {
            return "reduction";
        }
        return policy.trim().toLowerCase();
    }

    private static void validateCouponPolicyValues(String policy, IdrCouponCreateReq req) {
        switch (policy) {
            case "reduction" -> {
                if (req.reduction() == null || req.reduction() <= 0) {
                    throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.coupon_reduction_required");
                }
            }
            case "fixed" -> {
                if (req.fixed() == null || req.fixed() <= 0) {
                    throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.coupon_fixed_price_required");
                }
            }
            case "discount" -> {
                if (req.discount() == null || req.discount() < 1 || req.discount() > 100) {
                    throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.coupon_discount_range");
                }
            }
            default -> throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.coupon_policy_unsupported");
        }
    }

    private void requireConfigured() {
        if (!idataRiverClient.isConfigured()) {
            throw BizException.keyed(ResultCode.BAD_REQUEST, "idr.not_configured");
        }
    }

    private static String text(JsonNode node, String field) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        JsonNode v = node.path(field);
        if (v.isMissingNode() || v.isNull()) {
            return null;
        }
        String s = v.asText();
        return s == null || s.isBlank() ? null : s;
    }

    private static Integer intOrNull(JsonNode node, String field) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        JsonNode v = node.path(field);
        if (v.isMissingNode() || v.isNull() || !v.isNumber()) {
            return null;
        }
        return v.asInt();
    }

    private static Double doubleOrNull(JsonNode node, String field) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        JsonNode v = node.path(field);
        if (v.isMissingNode() || v.isNull() || !v.isNumber()) {
            return null;
        }
        return v.asDouble();
    }
}
