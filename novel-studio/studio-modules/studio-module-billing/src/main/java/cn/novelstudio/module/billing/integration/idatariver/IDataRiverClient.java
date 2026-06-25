package cn.novelstudio.module.billing.integration.idatariver;

import cn.novelstudio.module.billing.service.IDataRiverConfigService;
import cn.novelstudio.module.billing.service.IDataRiverConfigService.EffectiveConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class IDataRiverClient {

    private static final Logger log = LoggerFactory.getLogger(IDataRiverClient.class);

    private final IDataRiverConfigService configService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(8))
        .build();

    public boolean isConfigured() {
        return config().isConfigured();
    }

    public String createOrder(String projectId, String skuId, Map<String, Object> orderInfo) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("projectId", projectId);
        body.put("skuId", skuId);
        body.put("orderInfo", orderInfo);
        JsonNode result = post("/mapi/order/add", body);
        String orderId = text(result, "orderId");
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalStateException("iDataRiver 下单未返回 orderId");
        }
        return orderId;
    }

    public JsonNode getOrderInfo(String orderId) {
        return get("/mapi/order/info", Map.of("id", orderId));
    }

    /** 商户基础信息，用于校验 Developer Secret。 */
    public JsonNode getMerchantBasicInfo() {
        return get("/mapi/merchant/basicInfo", Map.of());
    }

    /** 项目详情，用于校验 Project ID 与 SKU 配置。 */
    public JsonNode getProjectDetail(String projectId) {
        return get("/mapi/project/detail", Map.of("id", projectId));
    }

    /** 商家全部项目（含未上线）。 */
    public JsonNode listProjects() {
        return get("/mapi/project/list", Map.of());
    }

    public JsonNode getSkuDetail(String skuId) {
        return get("/mapi/project/sku/detail", Map.of("id", skuId));
    }

    public JsonNode updateSku(Map<String, Object> body) {
        return post("/mapi/project/sku/update", body);
    }

    public PayOrderResult payOrder(String orderId, String method, String redirectUrl, String callbackUrl) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", orderId);
        body.put("method", method);
        if (redirectUrl != null && !redirectUrl.isBlank()) {
            body.put("redirectUrl", redirectUrl);
        }
        if (callbackUrl != null && !callbackUrl.isBlank()) {
            body.put("callbackUrl", callbackUrl);
        }
        JsonNode result = post("/mapi/order/pay", body);
        PayOrderResult out = new PayOrderResult();
        out.payUrl = text(result, "payUrl");
        out.payCurrency = text(result, "payCurrency");
        out.amount = result.path("amount").isNumber() ? result.path("amount").asDouble() : null;
        return out;
    }

    public List<PaymentMethodView> parsePaymentMethods(JsonNode orderInfo) {
        List<PaymentMethodView> methods = new ArrayList<>();
        JsonNode payments = orderInfo.path("mPayments");
        if (!payments.isArray()) {
            return methods;
        }
        for (JsonNode node : payments) {
            if (!node.path("enabled").asBoolean(false)) {
                continue;
            }
            PaymentMethodView m = new PaymentMethodView();
            m.method = text(node, "method");
            m.name = text(node, "name");
            m.desc = text(node, "desc");
            m.platform = node.path("isPlatform").asBoolean(true);
            if (m.method != null && !m.method.isBlank()) {
                methods.add(m);
            }
        }
        return methods;
    }

    public String orderStatus(JsonNode orderInfo) {
        return text(orderInfo, "status");
    }

    private JsonNode post(String path, Map<String, Object> body) {
        try {
            String json = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl(path)))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json")
                .header("Authorization", authHeader())
                .header("X-Idr-Locale", config().getLocale())
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return parseResponse(response);
        } catch (Exception ex) {
            log.warn("iDataRiver POST {} failed: {}", path, ex.getMessage());
            throw new IllegalStateException("支付服务暂不可用: " + ex.getMessage());
        }
    }

    private JsonNode get(String path, Map<String, String> query) {
        try {
            StringBuilder url = new StringBuilder(baseUrl(path));
            if (!query.isEmpty()) {
                url.append('?');
                boolean first = true;
                for (Map.Entry<String, String> e : query.entrySet()) {
                    if (!first) {
                        url.append('&');
                    }
                    first = false;
                    url.append(URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8));
                    url.append('=');
                    url.append(URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8));
                }
            }
            HttpRequest request = HttpRequest.newBuilder(URI.create(url.toString()))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", authHeader())
                .header("X-Idr-Locale", config().getLocale())
                .GET()
                .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return parseResponse(response);
        } catch (Exception ex) {
            log.warn("iDataRiver GET {} failed: {}", path, ex.getMessage());
            throw new IllegalStateException("支付服务暂不可用: " + ex.getMessage());
        }
    }

    private JsonNode parseResponse(HttpResponse<String> response) throws Exception {
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("支付网关 HTTP " + response.statusCode());
        }
        JsonNode root = objectMapper.readTree(response.body());
        int code = root.path("code").asInt(-1);
        if (code != 0) {
            String msg = root.path("msg").asText("支付网关错误");
            throw new IllegalStateException(msg + " (code=" + code + ")");
        }
        JsonNode result = root.path("result");
        return result.isMissingNode() || result.isNull() ? root : result;
    }

    private EffectiveConfig config() {
        return configService.effective();
    }

    private String baseUrl(String path) {
        String base = config().getBaseUrl() == null ? "https://open.idatariver.com" : config().getBaseUrl().trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + path;
    }

    private String authHeader() {
        String secret = config().getMerchantSecret().trim();
        return secret.startsWith("Bear ") || secret.startsWith("Bearer ")
            ? secret.replaceFirst("^Bear ", "Bearer ")
            : "Bearer " + secret;
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.path(field);
        if (v.isMissingNode() || v.isNull()) {
            return null;
        }
        String s = v.asText();
        return s == null || s.isBlank() ? null : s;
    }

    public static class PayOrderResult {
        public String payUrl;
        public String payCurrency;
        public Double amount;
    }

    public static class PaymentMethodView {
        public String method;
        public String name;
        public String desc;
        public boolean platform;
    }
}
