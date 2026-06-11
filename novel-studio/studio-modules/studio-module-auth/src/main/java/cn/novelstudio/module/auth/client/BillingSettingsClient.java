package cn.novelstudio.module.auth.client;

import cn.novelstudio.module.auth.config.AuthIntegrationProperties;
import cn.novelstudio.module.billing.dto.PublicSiteSettingsResp;
import cn.novelstudio.module.billing.service.biz.SiteSettingsBiz;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BillingSettingsClient {

    private final SiteSettingsBiz siteSettingsBiz;
    private final AuthIntegrationProperties integrationProperties;

    public boolean isRegistrationEnabled() {
        if (!integrationProperties.getBilling().isEnabled()) {
            return true;
        }
        try {
            PublicSiteSettingsResp settings = siteSettingsBiz.publicSettings();
            return settings == null || settings.registrationEnabled();
        } catch (Exception ex) {
            log.warn("billing settings fetch failed, allow registration: {}", ex.getMessage());
            return true;
        }
    }
}
