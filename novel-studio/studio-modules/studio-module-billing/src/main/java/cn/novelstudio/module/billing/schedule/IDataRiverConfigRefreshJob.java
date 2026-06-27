package cn.novelstudio.module.billing.schedule;

import cn.novelstudio.module.billing.service.IDataRiverConfigService;
import cn.novelstudio.platform.scheduling.StudioScheduledJob;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class IDataRiverConfigRefreshJob implements StudioScheduledJob {

    private final IDataRiverConfigService configService;

    @Override
    public String jobId() {
        return "payment-idatariver-config-refresh";
    }

    @Override
    public long initialDelayMs() {
        return 30_000;
    }

    @Override
    public long fixedDelayMs() {
        return 30_000;
    }

    @Override
    public void run() {
        configService.refresh();
    }
}
