package cn.novelstudio.module.billing.service;

import cn.novelstudio.module.billing.dto.PaymentSettingsResp;
import cn.novelstudio.module.billing.dto.PaymentSettingsTestResp;
import cn.novelstudio.module.billing.dto.PaymentSettingsUpdateReq;
import cn.novelstudio.module.billing.entity.SiteSettingEntity;
import cn.novelstudio.module.billing.integration.idatariver.IDataRiverClient;
import cn.novelstudio.module.billing.repository.SiteSettingRepository;
import cn.novelstudio.module.billing.service.IDataRiverConfigService.EffectiveConfig;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PaymentSettingsBiz {

    private static final String DOCS_URL = "https://docs.idatariver.com/zh/guide/merchant_api.html";

    private final SiteSettingRepository siteSettingRepository;
    private final IDataRiverConfigService configService;
    private final IDataRiverClient idataRiverClient;
    private final ObjectMapper objectMapper;

    public PaymentSettingsResp getSettings() {
        EffectiveConfig config = configService.effective();
        String secret = config.getMerchantSecret();
        return new PaymentSettingsResp(
            config.isEnabled(),
            config.isConfigured(),
            secret != null && !secret.isBlank(),
            maskSecret(secret),
            config.getBaseUrl(),
            config.getProjectId(),
            config.getPublicBaseUrl(),
            config.getDefaultPayMethod(),
            config.getLocale(),
            config.webhookUrl(),
            DOCS_URL
        );
    }

    @Transactional
    public PaymentSettingsResp updateSettings(PaymentSettingsUpdateReq req) {
        Map<String, Object> updates = new LinkedHashMap<>();
        if (req.enabled() != null) {
            updates.put("payment.idatariver.enabled", req.enabled());
        }
        if (req.baseUrl() != null) {
            updates.put("payment.idatariver.base_url", req.baseUrl().trim());
        }
        if (req.merchantSecret() != null && !req.merchantSecret().isBlank()) {
            updates.put("payment.idatariver.merchant_secret", req.merchantSecret().trim());
        }
        if (req.projectId() != null) {
            updates.put("payment.idatariver.project_id", req.projectId().trim());
        }
        if (req.publicBaseUrl() != null) {
            updates.put("payment.idatariver.public_base_url", req.publicBaseUrl().trim());
        }
        if (req.defaultPayMethod() != null) {
            updates.put("payment.idatariver.default_pay_method", req.defaultPayMethod().trim());
        }
        if (req.locale() != null) {
            updates.put("payment.idatariver.locale", req.locale().trim());
        }
        for (Map.Entry<String, Object> entry : updates.entrySet()) {
            upsert(entry.getKey(), entry.getValue());
        }
        configService.refresh();
        return getSettings();
    }

    public PaymentSettingsTestResp testConnection() {
        EffectiveConfig config = configService.effective();
        if (!config.isEnabled()) {
            return new PaymentSettingsTestResp(false, "支付未启用，请先在后台开启 iDataRiver");
        }
        if (config.getMerchantSecret() == null || config.getMerchantSecret().isBlank()) {
            return new PaymentSettingsTestResp(false, "未配置 Merchant Secret。请在 iDataRiver 控制台 → 开发者 复制密钥后保存");
        }
        try {
            var merchant = idataRiverClient.getMerchantBasicInfo();
            String merchantLabel = firstNonBlank(
                text(merchant, "name"),
                text(merchant, "merchantName"),
                text(merchant, "id")
            );
            if (config.getProjectId() == null || config.getProjectId().isBlank()) {
                return new PaymentSettingsTestResp(
                    true,
                    merchantLabel == null
                        ? "Merchant Secret 有效（未配置 Project ID，跳过项目校验）"
                        : "Merchant Secret 有效，商户：" + merchantLabel + "（未配置 Project ID）"
                );
            }
            var project = idataRiverClient.getProjectDetail(config.getProjectId().trim());
            String projectName = firstNonBlank(text(project, "name"), text(project, "id"));
            String projectStatus = text(project, "status");
            String suffix = projectName == null ? config.getProjectId() : projectName;
            if (projectStatus != null && !projectStatus.isBlank()) {
                suffix += "（" + projectStatus + "）";
            }
            return new PaymentSettingsTestResp(true, "连接成功：商户 Secret 有效，项目 " + suffix);
        } catch (IllegalStateException ex) {
            return new PaymentSettingsTestResp(false, mapIdrError(ex.getMessage()));
        }
    }

    private static String mapIdrError(String message) {
        if (message == null || message.isBlank()) {
            return "连接失败，请检查 Merchant Secret 与 Project ID";
        }
        if (message.contains("code=1004")) {
            return "权限不足 (1004)：Merchant Secret 无效。请到 iDataRiver 控制台 → 开发者 复制正确的密钥";
        }
        if (message.contains("code=1002")) {
            return "项目不存在 (1002)：请检查 Project ID 是否与控制台一致";
        }
        if (message.contains("code=1001")) {
            return "参数错误 (1001)：" + stripCodeSuffix(message);
        }
        if (message.contains("code=1003")) {
            return "网关繁忙 (1003)，请稍后重试";
        }
        if (message.contains("code=1000")) {
            return "网关内部错误 (1000)，请确认 Merchant Secret 正确且 API 地址为 https://open.idatariver.com";
        }
        if (message.contains("401") || message.contains("403")) {
            return "鉴权失败，请检查 Merchant Secret：" + message;
        }
        return stripCodeSuffix(message);
    }

    private static String stripCodeSuffix(String message) {
        return message.replaceAll("\\s*\\(code=\\d+\\)\\s*$", "").trim();
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
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

    private void upsert(String key, Object value) {
        SiteSettingEntity entity = siteSettingRepository.findById(key).orElseGet(() -> {
            SiteSettingEntity created = new SiteSettingEntity();
            created.setSettingKey(key);
            return created;
        });
        entity.setValueJson(writeJson(value));
        siteSettingRepository.save(entity);
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw BizException.of(ResultCode.BAD_REQUEST, "参数值无法序列化");
        }
    }

    static String maskSecret(String secret) {
        if (secret == null || secret.isBlank()) {
            return "";
        }
        String trimmed = secret.trim();
        if (trimmed.length() <= 4) {
            return "****";
        }
        return "****" + trimmed.substring(trimmed.length() - 4);
    }
}
