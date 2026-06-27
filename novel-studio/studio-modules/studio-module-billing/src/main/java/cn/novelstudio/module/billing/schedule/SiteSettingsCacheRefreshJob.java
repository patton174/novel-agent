package cn.novelstudio.module.billing.schedule;

import cn.novelstudio.module.billing.service.biz.SiteSettingsBiz;
import cn.novelstudio.platform.scheduling.StudioScheduledJob;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SiteSettingsCacheRefreshJob implements StudioScheduledJob {

    private final SiteSettingsBiz siteSettingsBiz;

    @Override
    public String jobId() {
        return "site-settings-cache-refresh";
    }

    @Override
    public long initialDelayMs() {
        return 60_000;
    }

    @Override
    public long fixedDelayMs() {
        return 60_000;
    }

    @Override
    public void run() {
        siteSettingsBiz.refreshCacheScheduled();
    }
}
