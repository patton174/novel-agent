package cn.novelstudio.module.worker.controller.crm;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.worker.service.crm.biz.WorkerCrmJobsBiz;
import cn.novelstudio.module.worker.service.crm.resp.ManualRunResp;
import cn.novelstudio.module.worker.service.crm.resp.ScheduledJobRunResp;
import cn.novelstudio.platform.web.AuthRoleSupport;
import cn.novelstudio.platform.web.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/worker/crm/jobs")
@RequiredArgsConstructor
public class WorkerCrmJobRunController extends BaseController {

    private final WorkerCrmJobsBiz biz;

    @PostMapping("/{jobId}/run")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Result<ManualRunResp> runJob(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable String jobId
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.runJob(jobId);
    }

    @GetMapping("/{jobId}/runs")
    public Result<List<ScheduledJobRunResp>> jobRuns(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable String jobId,
        @RequestParam(defaultValue = "20") int limit
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.jobRuns(jobId, limit);
    }
}
