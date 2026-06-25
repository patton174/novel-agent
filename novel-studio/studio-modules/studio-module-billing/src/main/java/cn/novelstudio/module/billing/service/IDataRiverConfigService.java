package cn.novelstudio.module.billing.service;

import cn.novelstudio.module.billing.config.IDataRiverProperties;
import cn.novelstudio.module.billing.entity.SiteSettingEntity;
import cn.novelstudio.module.billing.repository.SiteSettingRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

@Service
@RequiredArgsConstructor
public class IDataRiverConfigService {

    private static final Logger log = LoggerFactory.getLogger(IDataRiverConfigService.class);

    static final Set<String> SETTING_KEYS = Set.of(
        "payment.idatariver.enabled",
        "payment.idatariver.base_url",
        "payment.idatariver.merchant_secret",
        "payment.idatariver.project_id",
        "payment.idatariver.public_base_url",
        "payment.idatariver.default_pay_method",
        "payment.idatariver.locale"
    );

    private final IDataRiverProperties envProperties;
    private final SiteSettingRepository siteSettingRepository;
    private final ObjectMapper objectMapper;

    private final AtomicReference<Map<String, String>> dbSettings = new AtomicReference<>(Map.of());

    @PostConstruct
    void init() {
        refresh();
    }

    @Scheduled(fixedRate = 30_000)
    public void refreshScheduled() {
        refresh();
    }

    public void refresh() {
        Map<String, String> merged = new LinkedHashMap<>();
        for (SiteSettingEntity entity : siteSettingRepository.findAll()) {
            if (SETTING_KEYS.contains(entity.getSettingKey())) {
                merged.put(entity.getSettingKey(), readSettingValue(entity.getValueJson()));
            }
        }
        dbSettings.set(Map.copyOf(merged));
    }

    public EffectiveConfig effective() {
        boolean enabled = readBoolean(db("payment.idatariver.enabled"), envProperties.isEnabled());
        String baseUrl = pick(db("payment.idatariver.base_url"), envProperties.getBaseUrl(), "https://open.idatariver.com");
        String merchantSecret = pick(db("payment.idatariver.merchant_secret"), envProperties.getMerchantSecret(), "");
        String projectId = pick(db("payment.idatariver.project_id"), envProperties.getProjectId(), "");
        String publicBaseUrl = pick(
            db("payment.idatariver.public_base_url"),
            envProperties.getPublicBaseUrl(),
            "https://www.novel-agent.cn"
        );
        String defaultPayMethod = pick(db("payment.idatariver.default_pay_method"), envProperties.getDefaultPayMethod(), "alipay");
        String locale = pick(db("payment.idatariver.locale"), envProperties.getLocale(), "zh-cn");
        return new EffectiveConfig(
            enabled,
            baseUrl,
            merchantSecret,
            projectId,
            publicBaseUrl,
            defaultPayMethod,
            locale
        );
    }

    public Map<String, String> dbSnapshot() {
        return dbSettings.get();
    }

    private String db(String key) {
        return dbSettings.get().get(key);
    }

    private static String pick(String dbValue, String envValue, String fallback) {
        if (dbValue != null && !dbValue.isBlank()) {
            return dbValue.trim();
        }
        if (envValue != null && !envValue.isBlank()) {
            return envValue.trim();
        }
        return fallback == null ? "" : fallback;
    }

    private static boolean readBoolean(String raw, boolean envDefault) {
        if (raw == null || raw.isBlank()) {
            return envDefault;
        }
        String value = raw.trim();
        if ("true".equalsIgnoreCase(value) || "1".equals(value)) {
            return true;
        }
        if ("false".equalsIgnoreCase(value) || "0".equals(value)) {
            return false;
        }
        return envDefault;
    }

    private String readSettingValue(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            Object parsed = objectMapper.readValue(raw, Object.class);
            return parsed == null ? null : String.valueOf(parsed);
        } catch (JsonProcessingException ex) {
            log.warn("invalid payment settings json: {}", raw);
            return raw.trim();
        }
    }

    @Getter
    public static final class EffectiveConfig {
        private final boolean enabled;
        private final String baseUrl;
        private final String merchantSecret;
        private final String projectId;
        private final String publicBaseUrl;
        private final String defaultPayMethod;
        private final String locale;

        EffectiveConfig(
            boolean enabled,
            String baseUrl,
            String merchantSecret,
            String projectId,
            String publicBaseUrl,
            String defaultPayMethod,
            String locale
        ) {
            this.enabled = enabled;
            this.baseUrl = baseUrl;
            this.merchantSecret = merchantSecret;
            this.projectId = projectId;
            this.publicBaseUrl = publicBaseUrl;
            this.defaultPayMethod = defaultPayMethod;
            this.locale = locale;
        }

        public boolean isConfigured() {
            return enabled
                && merchantSecret != null && !merchantSecret.isBlank();
        }

        public String webhookUrl() {
            return publicUrl("/api/billing/webhook/idatariver");
        }

        public String publicUrl(String path) {
            String base = publicBaseUrl == null || publicBaseUrl.isBlank()
                ? "https://www.novel-agent.cn"
                : publicBaseUrl.trim();
            if (base.endsWith("/")) {
                base = base.substring(0, base.length() - 1);
            }
            if (!path.startsWith("/")) {
                path = "/" + path;
            }
            return base + path;
        }
    }
}
