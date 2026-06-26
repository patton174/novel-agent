package cn.novelstudio.module.worker.controller.crm;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.worker.service.crm.biz.WorkerCrmJobsBiz;
import cn.novelstudio.platform.scheduling.batch.BatchJobHistoryEntry;
import cn.novelstudio.module.worker.service.crm.resp.WorkerJobsOverviewResp;
import cn.novelstudio.module.worker.service.crm.resp.WorkerJobsOverviewResp.BatchDispatchReq;
import cn.novelstudio.platform.web.BaseController;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/worker/crm/jobs")
@RequiredArgsConstructor
public class WorkerCrmJobsController extends BaseController {

    private final WorkerCrmJobsBiz biz;

    @GetMapping("/overview")
    public Result<WorkerJobsOverviewResp> overview() {
        return biz.overview();
    }

    @PostMapping("/batch-dispatch")
    public Result<Void> batchDispatch(@Valid @RequestBody BatchDispatchReq req) {
        return biz.dispatchBatch(req);
    }

    @GetMapping("/history")
    public Result<List<BatchJobHistoryEntry>> history(
        @RequestParam(defaultValue = "20") int limit
    ) {
        return biz.history(limit);
    }
}
