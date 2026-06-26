package cn.novelstudio.module.worker.service.crm.biz;

import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.upload.batch.BatchJobHandler;
import cn.novelstudio.module.worker.service.crm.resp.WorkerJobsOverviewResp;
import cn.novelstudio.module.worker.service.crm.resp.WorkerJobsOverviewResp.BatchDispatchReq;
import cn.novelstudio.module.worker.service.crm.resp.WorkerJobsOverviewResp.BatchJobTypeResp;
import cn.novelstudio.module.worker.service.crm.resp.WorkerJobsOverviewResp.MqConsumerResp;
import cn.novelstudio.module.worker.service.crm.resp.WorkerJobsOverviewResp.JobsRuntimeMeta;
import cn.novelstudio.module.worker.service.crm.resp.WorkerJobsOverviewResp.ScheduledJobResp;
import cn.novelstudio.platform.messaging.constant.MqTopic;
import cn.novelstudio.platform.scheduling.StudioJobCatalog;
import cn.novelstudio.platform.scheduling.StudioSchedulingProperties;
import cn.novelstudio.platform.scheduling.batch.BatchJobHistoryEntry;
import cn.novelstudio.platform.scheduling.batch.BatchJobHistoryStore;
import cn.novelstudio.platform.scheduling.batch.BatchJobDispatcher;
import cn.novelstudio.platform.scheduling.batch.BatchJobEnvelope;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class WorkerCrmJobsBiz extends BaseBiz {

    private final StudioJobCatalog jobCatalog;
    private final StudioSchedulingProperties schedulingProperties;
    private final List<BatchJobHandler> batchJobHandlers;
    private final ObjectProvider<BatchJobDispatcher> batchJobDispatcher;
    private final BatchJobHistoryStore batchJobHistoryStore;

    public Result<WorkerJobsOverviewResp> overview() {
        List<ScheduledJobResp> scheduled = new ArrayList<>();
        jobCatalog.list().forEach(job -> scheduled.add(new ScheduledJobResp(
            job.jobId(),
            "studio",
            job.initialDelayMs(),
            job.fixedDelayMs()
        )));
        scheduled.addAll(legacySpringScheduled());

        List<MqConsumerResp> mqConsumers = new ArrayList<>();
        for (MqTopic topic : MqTopic.values()) {
            mqConsumers.add(new MqConsumerResp(
                topic.name().toLowerCase(),
                topic.getQueue(),
                topic.getExchange(),
                topic.getRoutingKey()
            ));
        }

        List<BatchJobTypeResp> batchJobTypes = batchJobHandlers.stream()
            .map(h -> new BatchJobTypeResp(h.jobType(), h.getClass().getSimpleName()))
            .toList();

        JobsRuntimeMeta meta = new JobsRuntimeMeta(
            schedulingProperties.isEnabled(),
            batchJobDispatcher.getIfAvailable() != null,
            schedulingProperties.getDefaultLockSeconds()
        );

        return ok(new WorkerJobsOverviewResp(scheduled, mqConsumers, batchJobTypes, meta));
    }

    public Result<Void> dispatchBatch(BatchDispatchReq req) {
        if (req.jobType() == null || req.jobType().isBlank()) {
            throw ValidationException.keyed("batch.job_type_required");
        }
        if (req.itemIds() == null || req.itemIds().isEmpty()) {
            throw ValidationException.keyed("batch.item_ids_required");
        }
        boolean supported = batchJobHandlers.stream().anyMatch(h -> h.supports(req.jobType()));
        if (!supported) {
            throw ValidationException.keyed("batch.unknown_job_type", req.jobType());
        }
        BatchJobDispatcher dispatcher = batchJobDispatcher.getIfAvailable();
        if (dispatcher == null) {
            throw new IllegalStateException("batch.mq_unavailable");
        }
        String batchId = UUID.randomUUID().toString();
        Map<String, String> attrs = req.attributes() == null ? Map.of() : req.attributes();
        dispatcher.dispatch(new BatchJobEnvelope(req.jobType(), batchId, req.itemIds(), attrs));
        batchJobHistoryStore.append(BatchJobHistoryEntry.dispatched(batchId, req.jobType(), req.itemIds().size()));
        return ok();
    }

    public Result<List<BatchJobHistoryEntry>> history(int limit) {
        return ok(batchJobHistoryStore.recent(limit));
    }

    private static List<ScheduledJobResp> legacySpringScheduled() {
        return List.of(
            new ScheduledJobResp("payment-idatariver-config-refresh", "spring", 0, 30_000),
            new ScheduledJobResp("site-settings-cache-refresh", "spring", 0, 60_000),
            new ScheduledJobResp("agent-run-proxy-heartbeat", "spring", 0, 15_000)
        );
    }
}
