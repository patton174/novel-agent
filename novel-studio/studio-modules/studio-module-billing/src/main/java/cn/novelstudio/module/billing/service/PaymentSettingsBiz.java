package cn.novelstudio.module.billing.service;



import cn.novelstudio.module.billing.dto.PaymentSettingsResp;

import cn.novelstudio.module.billing.dto.PaymentSettingsTestResp;

import cn.novelstudio.module.billing.dto.PaymentSettingsUpdateReq;

import cn.novelstudio.module.billing.entity.SiteSettingEntity;

import cn.novelstudio.module.billing.integration.idatariver.IDataRiverClient;

import cn.novelstudio.module.billing.repository.SiteSettingRepository;

import cn.novelstudio.module.billing.service.IDataRiverConfigService.EffectiveConfig;

import cn.novelstudio.platform.i18n.StudioMessages;

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

    private final StudioMessages messages;



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

            return new PaymentSettingsTestResp(false, msg("payment.settings.test.not_enabled"));

        }

        if (config.getMerchantSecret() == null || config.getMerchantSecret().isBlank()) {

            return new PaymentSettingsTestResp(false, msg("payment.settings.test.secret_missing"));

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

                        ? msg("payment.settings.test.secret_ok_no_project")

                        : msg("payment.settings.test.secret_ok_merchant_no_project", merchantLabel)

                );

            }

            var project = idataRiverClient.getProjectDetail(config.getProjectId().trim());

            String projectName = firstNonBlank(text(project, "name"), text(project, "id"));

            String projectStatus = text(project, "status");

            String suffix = projectName == null ? config.getProjectId() : projectName;

            if (projectStatus != null && !projectStatus.isBlank()) {

                suffix += "（" + projectStatus + "）";

            }

            return new PaymentSettingsTestResp(true, msg("payment.settings.test.success", suffix));

        } catch (IllegalStateException ex) {

            return new PaymentSettingsTestResp(false, mapIdrError(ex.getMessage()));

        }

    }



    private String mapIdrError(String message) {

        if (message == null || message.isBlank()) {

            return msg("payment.settings.test.failed_generic");

        }

        if (message.contains("code=1004")) {

            return msg("payment.settings.test.error_1004");

        }

        if (message.contains("code=1002")) {

            return msg("payment.settings.test.error_1002");

        }

        if (message.contains("code=1001")) {

            return msg("payment.settings.test.error_1001", stripCodeSuffix(message));

        }

        if (message.contains("code=1003")) {

            return msg("payment.settings.test.error_1003");

        }

        if (message.contains("code=1000")) {

            return msg("payment.settings.test.error_1000");

        }

        if (message.contains("401") || message.contains("403")) {

            return msg("payment.settings.test.auth_failed", message);

        }

        return stripCodeSuffix(message);

    }



    private String msg(String key, Object... args) {

        return messages.get(key, args);

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

            throw BizException.keyed(ResultCode.BAD_REQUEST, "billing.settings.serialize_failed");

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


