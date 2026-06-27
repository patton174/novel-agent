package cn.novelstudio.module.billing.schedule;

import cn.novelstudio.module.billing.service.SiteDanmakuTranslationService;
import cn.novelstudio.platform.i18n.I18nProperties;
import cn.novelstudio.platform.scheduling.StudioScheduledJob;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SiteDanmakuTranslationJob implements StudioScheduledJob {

    private final SiteDanmakuTranslationService translationService;
    private final I18nProperties i18nProperties;

    @Override
    public String jobId() {
        return "site-danmaku-translation";
    }

    @Override
    public long initialDelayMs() {
        return 150_000;
    }

    @Override
    public long fixedDelayMs() {
        long interval = i18nProperties.getSiteContentSyncIntervalMs();
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
