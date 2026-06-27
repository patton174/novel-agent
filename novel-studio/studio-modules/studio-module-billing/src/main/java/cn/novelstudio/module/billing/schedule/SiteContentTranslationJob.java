package cn.novelstudio.module.billing.schedule;

import cn.novelstudio.module.billing.service.SiteContentTranslationService;
import cn.novelstudio.platform.i18n.I18nProperties;
import cn.novelstudio.platform.scheduling.StudioScheduledJob;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SiteContentTranslationJob implements StudioScheduledJob {

    private final SiteContentTranslationService translationService;
    private final I18nProperties i18nProperties;

    @Override
    public String jobId() {
        return "site-content-translation";
    }

    @Override
    public long initialDelayMs() {
        return 120_000;
    }

    @Override
    public long fixedDelayMs() {
        long interval = i18nProperties.getSiteContentSyncIntervalMs();
        // 0 = disabled; registrar requires positive delay
        return interval <= 0 ? 86_400_000L : interval;
    }

    @Override
    public void run() {
        if (i18nProperties.getSiteContentSyncIntervalMs() <= 0) {
            return;
        }
        translationService.syncPending();
    }
}
