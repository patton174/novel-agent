package com.novel.agent.billing.service.biz;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.billing.dto.PublicSiteSettingsResp;
import com.novel.agent.billing.dto.SiteSettingsResp;
import com.novel.agent.billing.dto.SiteSettingsUpdateReq;
import com.novel.agent.billing.entity.SiteSettingEntity;
import com.novel.agent.billing.repository.SiteSettingRepository;
import com.novel.agent.billing.service.AuditLogService;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.common.core.exception.BizException;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

@Slf4j
@Component
@RequiredArgsConstructor
public class SiteSettingsBiz extends BaseBiz {

    static final Set<String> ALLOWED_KEYS = Set.of(
        "registration.enabled",
        "registration.require_email_verify",
        "agent.default_model",
        "agent.max_tokens_per_run",
        "crawl.max_concurrent_jobs"
    );

    private static final Map<String, Object> DEFAULTS = Map.of(
        "registration.enabled", true,
        "registration.require_email_verify", true,
        "agent.default_model", "deepseek-chat",
        "agent.max_tokens_per_run", 4096,
        "crawl.max_concurrent_jobs", 2
    );

    private final SiteSettingRepository siteSettingRepository;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    private final AtomicReference<Map<String, Object>> cache = new AtomicReference<>(DEFAULTS);

    @PostConstruct
    void init() {
        refreshCache();
    }

    @Scheduled(fixedRate = 60_000)
    public void refreshCacheScheduled() {
        refreshCache();
    }

    public Result<SiteSettingsResp> getSettings() {
        return ok(new SiteSettingsResp(effectiveSettings()));
    }

    public PublicSiteSettingsResp publicSettings() {
        Map<String, Object> settings = effectiveSettings();
        return new PublicSiteSettingsResp(
            readBoolean(settings.get("registration.enabled"), true),
            readBoolean(settings.get("registration.require_email_verify"), true)
        );
    }

    public boolean isRegistrationEnabled() {
        return readBoolean(effectiveSettings().get("registration.enabled"), true);
    }

    @Transactional
    public Result<SiteSettingsResp> updateSettings(SiteSettingsUpdateReq req, Long actorId) {
        Map<String, Object> before = effectiveSettings();
        Map<String, Object> patch = req.settings() == null ? Map.of() : req.settings();
        for (Map.Entry<String, Object> entry : patch.entrySet()) {
            String key = entry.getKey();
            if (!ALLOWED_KEYS.contains(key)) {
                throw BizException.of(ResultCode.BAD_REQUEST, "不支持的参数: " + key);
            }
            SiteSettingEntity entity = siteSettingRepository.findById(key)
                .orElseGet(() -> {
                    SiteSettingEntity created = new SiteSettingEntity();
                    created.setSettingKey(key);
                    return created;
                });
            entity.setValueJson(writeJson(entry.getValue()));
            entity.setUpdatedBy(actorId);
            siteSettingRepository.save(entity);
        }
        refreshCache();
        Map<String, Object> after = effectiveSettings();
        auditLogService.log(actorId, "site.settings.update", "site_settings", "global", before, after);
        return ok(new SiteSettingsResp(after));
    }

    private Map<String, Object> effectiveSettings() {
        Map<String, Object> cached = cache.get();
        if (cached != null && !cached.isEmpty()) {
            return cached;
        }
        return refreshCache();
    }

    private Map<String, Object> refreshCache() {
        Map<String, Object> merged = new LinkedHashMap<>(DEFAULTS);
        for (SiteSettingEntity entity : siteSettingRepository.findAll()) {
            if (!ALLOWED_KEYS.contains(entity.getSettingKey())) {
                continue;
            }
            merged.put(entity.getSettingKey(), readJson(entity.getValueJson()));
        }
        cache.set(Map.copyOf(merged));
        return merged;
    }

    private Object readJson(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(raw, Object.class);
        } catch (JsonProcessingException ex) {
            log.warn("invalid settings json for value: {}", raw);
            return raw;
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw BizException.of(ResultCode.BAD_REQUEST, "参数值无法序列化");
        }
    }

    static boolean readBoolean(Object value, boolean defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Boolean b) {
            return b;
        }
        return Boolean.parseBoolean(String.valueOf(value));
    }
}
