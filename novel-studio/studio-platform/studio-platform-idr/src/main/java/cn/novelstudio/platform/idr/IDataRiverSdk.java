package cn.novelstudio.platform.idr;

import cn.novelstudio.platform.idr.model.PayOrderResult;
import cn.novelstudio.platform.idr.model.PaymentMethodView;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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

/**
 * iDataRiver Open API 纯 HTTP 客户端（无 Spring 依赖）。
 * 业务模块通过 {@link IDataRiverConnection} 注入运行时凭证。
 */
public class IDataRiverSdk {

    private static final Logger log = LoggerFactory.getLogger(IDataRiverSdk.class);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public IDataRiverSdk(ObjectMapper objectMapper) {
        this(objectMapper, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build());
    }

    public IDataRiverSdk(ObjectMapper objectMapper, HttpClient httpClient) {
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
    }

    public boolean isConfigured(IDataRiverConnection connection) {
        return connection != null && connection.isConfigured();
    }

    public String createOrder(IDataRiverConnection connection, String projectId, String skuId, Map<String, Object> orderInfo) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("projectId", projectId);
        body.put("skuId", skuId);
        body.put("orderInfo", orderInfo);
        JsonNode result = post(connection, "/mapi/order/add", body);
        String orderId = text(result, "orderId");
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalStateException("payment.gateway.no_order_id");
        }
        return orderId;
    }

    public JsonNode getOrderInfo(IDataRiverConnection connection, String orderId) {
        return get(connection, "/mapi/order/info", Map.of("id", orderId));
    }

    public JsonNode getMerchantBasicInfo(IDataRiverConnection connection) {
        return get(connection, "/mapi/merchant/basicInfo", Map.of());
    }

    public JsonNode getProjectDetail(IDataRiverConnection connection, String projectId) {
        return get(connection, "/mapi/project/detail", Map.of("id", projectId));
    }

    public JsonNode listProjects(IDataRiverConnection connection) {
        return get(connection, "/mapi/project/list", Map.of());
    }

    public JsonNode getSkuDetail(IDataRiverConnection connection, String skuId) {
        return get(connection, "/mapi/project/sku/detail", Map.of("id", skuId));
    }

    public JsonNode updateSku(IDataRiverConnection connection, Map<String, Object> body) {
        return post(connection, "/mapi/project/sku/update", body);
    }

    public JsonNode addSku(IDataRiverConnection connection, String projectId) {
        return post(connection, "/mapi/project/sku/add", Map.of("projectId", projectId));
    }

    public JsonNode addPricing(IDataRiverConnection connection, String projectId) {
        return post(connection, "/mapi/project/pricing/add", Map.of("projectId", projectId));
    }

    public JsonNode updatePricing(IDataRiverConnection connection, Map<String, Object> body) {
        return post(connection, "/mapi/project/pricing/update", body);
    }

    public JsonNode addCoupon(IDataRiverConnection connection, String projectId) {
        return post(connection, "/mapi/project/coupon/add", Map.of("projectId", projectId));
    }

    public JsonNode updateCoupon(IDataRiverConnection connection, Map<String, Object> body) {
        return post(connection, "/mapi/project/coupon/update", body);
    }

    public PayOrderResult payOrder(
        IDataRiverConnection connection,
        String orderId,
        String method,
        String redirectUrl,
        String callbackUrl
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", orderId);
        body.put("method", method);
        if (redirectUrl != null && !redirectUrl.isBlank()) {
            body.put("redirectUrl", redirectUrl);
        }
        if (callbackUrl != null && !callbackUrl.isBlank()) {
            body.put("callbackUrl", callbackUrl);
        }
        JsonNode result = post(connection, "/mapi/order/pay", body);
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

    private JsonNode post(IDataRiverConnection connection, String path, Map<String, Object> body) {
        try {
            String json = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl(connection, path)))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json")
                .header("Authorization", authHeader(connection))
                .header("X-Idr-Locale", connection.getLocale())
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return parseResponse(response);
        } catch (Exception ex) {
            log.warn("iDataRiver POST {} failed: {}", path, ex.getMessage());
            throw new IllegalStateException("payment.gateway.unavailable");
        }
    }

    private JsonNode get(IDataRiverConnection connection, String path, Map<String, String> query) {
        try {
            StringBuilder url = new StringBuilder(baseUrl(connection, path));
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
                .header("Authorization", authHeader(connection))
                .header("X-Idr-Locale", connection.getLocale())
                .GET()
                .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return parseResponse(response);
        } catch (Exception ex) {
            log.warn("iDataRiver GET {} failed: {}", path, ex.getMessage());
            throw new IllegalStateException("payment.gateway.unavailable");
        }
    }

    private JsonNode parseResponse(HttpResponse<String> response) throws Exception {
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            log.warn("iDataRiver HTTP {} body={}", response.statusCode(), response.body());
            throw new IllegalStateException("payment.gateway.http_error");
        }
        JsonNode root = objectMapper.readTree(response.body());
        int code = root.path("code").asInt(-1);
        if (code != 0) {
            String msg = root.path("msg").asText("");
            log.warn("iDataRiver API error code={} msg={}", code, msg);
            if (msg.isBlank()) {
                throw new IllegalStateException("payment.gateway.api_error");
            }
            throw new IllegalStateException(msg);
        }
        JsonNode result = root.path("result");
        return result.isMissingNode() || result.isNull() ? root : result;
    }

    private static String baseUrl(IDataRiverConnection connection, String path) {
        String base = connection.getBaseUrl() == null ? "https://open.idatariver.com" : connection.getBaseUrl().trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + path;
    }

    private static String authHeader(IDataRiverConnection connection) {
        String secret = connection.getMerchantSecret().trim();
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
}
