package cn.novelstudio.module.billing.integration.idatariver;

import cn.novelstudio.module.billing.service.IDataRiverConfigService;
import cn.novelstudio.module.billing.service.IDataRiverConfigService.EffectiveConfig;
import cn.novelstudio.platform.idr.IDataRiverConnection;
import cn.novelstudio.platform.idr.IDataRiverSdk;
import cn.novelstudio.platform.idr.model.PayOrderResult;
import cn.novelstudio.platform.idr.model.PaymentMethodView;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/** billing 模块对 iDataRiver SDK 的 Spring 适配层（凭证来自 {@link IDataRiverConfigService}）。 */
@Component
public class IDataRiverClient {

    private final IDataRiverConfigService configService;
    private final ObjectMapper objectMapper;
    private final IDataRiverSdk sdk;

    public IDataRiverClient(IDataRiverConfigService configService, ObjectMapper objectMapper) {
        this.configService = configService;
        this.objectMapper = objectMapper;
        this.sdk = new IDataRiverSdk(objectMapper);
    }

    public boolean isConfigured() {
        return sdk.isConfigured(connection());
    }

    public String createOrder(String projectId, String skuId, Map<String, Object> orderInfo) {
        return sdk.createOrder(connection(), projectId, skuId, orderInfo);
    }

    public JsonNode getOrderInfo(String orderId) {
        return sdk.getOrderInfo(connection(), orderId);
    }

    public JsonNode getMerchantBasicInfo() {
        return sdk.getMerchantBasicInfo(connection());
    }

    public JsonNode getProjectDetail(String projectId) {
        return sdk.getProjectDetail(connection(), projectId);
    }

    public JsonNode listProjects() {
        return sdk.listProjects(connection());
    }

    public JsonNode getSkuDetail(String skuId) {
        return sdk.getSkuDetail(connection(), skuId);
    }

    public JsonNode updateSku(Map<String, Object> body) {
        return sdk.updateSku(connection(), body);
    }

    public JsonNode addSku(String projectId) {
        return sdk.addSku(connection(), projectId);
    }

    public JsonNode addPricing(String projectId) {
        return sdk.addPricing(connection(), projectId);
    }

    public JsonNode updatePricing(Map<String, Object> body) {
        return sdk.updatePricing(connection(), body);
    }

    public JsonNode addCoupon(String projectId) {
        return sdk.addCoupon(connection(), projectId);
    }

    public JsonNode updateCoupon(Map<String, Object> body) {
        return sdk.updateCoupon(connection(), body);
    }

    public PayOrderResult payOrder(String orderId, String method, String redirectUrl, String callbackUrl) {
        return sdk.payOrder(connection(), orderId, method, redirectUrl, callbackUrl);
    }

    public List<PaymentMethodView> parsePaymentMethods(JsonNode orderInfo) {
        return sdk.parsePaymentMethods(orderInfo);
    }

    public String orderStatus(JsonNode orderInfo) {
        return sdk.orderStatus(orderInfo);
    }

    private IDataRiverConnection connection() {
        EffectiveConfig config = configService.effective();
        return new IDataRiverConnection() {
            @Override
            public boolean isConfigured() {
                return config.isConfigured();
            }

            @Override
            public String getBaseUrl() {
                return config.getBaseUrl();
            }

            @Override
            public String getMerchantSecret() {
                return config.getMerchantSecret();
            }

            @Override
            public String getLocale() {
                return config.getLocale();
            }
        };
    }
}
