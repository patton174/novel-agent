package cn.novelstudio.module.billing.service;

import cn.novelstudio.module.billing.dto.idr.IdrCouponItemResp;
import cn.novelstudio.module.billing.dto.idr.IdrMerchantBasicResp;
import cn.novelstudio.module.billing.dto.idr.IdrPricingItemResp;
import cn.novelstudio.module.billing.dto.idr.IdrProjectDetailResp;
import cn.novelstudio.module.billing.dto.idr.IdrProjectItemResp;
import cn.novelstudio.module.billing.dto.idr.IdrProjectListResp;
import cn.novelstudio.module.billing.dto.idr.IdrSkuDetailResp;
import cn.novelstudio.module.billing.dto.idr.IdrSkuInventoryUpdateReq;
import cn.novelstudio.module.billing.dto.idr.IdrSkuItemResp;
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
            throw BizException.of(ResultCode.BAD_REQUEST, "项目 ID 不能为空");
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
            throw BizException.of(ResultCode.BAD_REQUEST, "SKU ID 不能为空");
        }
        JsonNode root = idataRiverClient.getSkuDetail(skuId.trim());
        return toSkuDetail(root);
    }

    public IdrSkuDetailResp updateSkuInventory(String skuId, IdrSkuInventoryUpdateReq req) {
        requireConfigured();
        if (skuId == null || skuId.isBlank()) {
            throw BizException.of(ResultCode.BAD_REQUEST, "SKU ID 不能为空");
        }
        if (req == null) {
            throw BizException.of(ResultCode.BAD_REQUEST, "请求不能为空");
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
            throw BizException.of(ResultCode.BAD_REQUEST, "请填写补充数量或修改上架状态");
        }
        idataRiverClient.updateSku(body);
        return skuDetail(trimmedSkuId);
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
                throw BizException.of(ResultCode.BAD_REQUEST, "单次最多补充 " + MAX_STOCK_BATCH + " 个库存");
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

    private void requireConfigured() {
        if (!idataRiverClient.isConfigured()) {
            throw BizException.of(ResultCode.BAD_REQUEST, "请先保存 iDataRiver Merchant Secret 并启用支付");
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
