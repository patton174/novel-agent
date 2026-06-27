package cn.novelstudio.module.worker.service.crm.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.platform.scheduling.ScheduledJobConfigService;
import cn.novelstudio.platform.scheduling.ScheduledJobConfigService.ScheduledJobConfigDto;
import cn.novelstudio.platform.scheduling.ScheduledJobConfigService.ScheduledJobConfigSaveReq;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WorkerCrmJobConfigBiz extends BaseBiz {

    private final ScheduledJobConfigService configService;

    public Result<ScheduledJobConfigDto> getConfig(String jobId) {
        return ok(configService.getConfig(jobId).orElseThrow());
    }

    public Result<ScheduledJobConfigDto> saveConfig(String jobId, ScheduledJobConfigSaveReq req, String actorHeader) {
        return ok(configService.saveConfig(jobId, req, parseUserId(actorHeader)));
    }

    public Result<Void> reload() {
        configService.publishReload();
        return ok();
    }
}
