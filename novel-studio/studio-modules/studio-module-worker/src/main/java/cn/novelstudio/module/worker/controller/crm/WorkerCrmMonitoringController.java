package cn.novelstudio.module.worker.controller.crm;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.worker.service.crm.biz.WorkerCrmMonitoringBiz;
import cn.novelstudio.module.worker.service.crm.resp.MonitoringSnapshotResp;
import cn.novelstudio.platform.web.AuthRoleSupport;
import cn.novelstudio.platform.web.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/worker/crm/monitoring")
@RequiredArgsConstructor
public class WorkerCrmMonitoringController extends BaseController {

    private final WorkerCrmMonitoringBiz biz;

    @GetMapping("/snapshot")
    public Result<MonitoringSnapshotResp> snapshot(
        @RequestHeader(value = "X-User-Roles", required = false) String roles
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.snapshot();
    }
}
