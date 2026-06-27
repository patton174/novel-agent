package cn.novelstudio.module.worker.controller.crm;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.worker.service.crm.biz.WorkerCrmJobConfigBiz;
import cn.novelstudio.platform.scheduling.ScheduledJobConfigService.ScheduledJobConfigDto;
import cn.novelstudio.platform.scheduling.ScheduledJobConfigService.ScheduledJobConfigSaveReq;
import cn.novelstudio.platform.web.AuthRoleSupport;
import cn.novelstudio.platform.web.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/worker/crm/jobs")
@RequiredArgsConstructor
public class WorkerCrmJobConfigController extends BaseController {

    private final WorkerCrmJobConfigBiz biz;

    @GetMapping("/{jobId}/config")
    public Result<ScheduledJobConfigDto> getConfig(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable String jobId
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.getConfig(jobId);
    }

    @PutMapping("/{jobId}/config")
    public Result<ScheduledJobConfigDto> saveConfig(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader,
        @PathVariable String jobId,
        @RequestBody ScheduledJobConfigSaveReq req
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.saveConfig(jobId, req, actorHeader);
    }

    @PostMapping("/reload")
    public Result<Void> reload(
        @RequestHeader(value = "X-User-Roles", required = false) String roles
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.reload();
    }
}
