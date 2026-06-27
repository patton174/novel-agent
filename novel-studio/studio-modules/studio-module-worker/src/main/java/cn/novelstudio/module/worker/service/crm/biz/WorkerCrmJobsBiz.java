package cn.novelstudio.module.worker.service.crm.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.upload.batch.BatchJobHandler;
import cn.novelstudio.module.worker.support.WorkerExceptions;
import cn.novelstudio.module.worker.service.crm.resp.WorkerJobsOverviewResp;
import cn.novelstudio.module.worker.service.crm.resp.WorkerJobsOverviewResp.BatchDispatchReq;
import cn.novelstudio.module.worker.service.crm.resp.ManualRunResp;
import cn.novelstudio.module.worker.service.crm.resp.ScheduledJobRunResp;
import cn.novelstudio.module.worker.entity.ScheduledJobRunEntity;
import cn.novelstudio.module.worker.repository.ScheduledJobRunRepository;
import cn.novelstudio.platform.scheduling.JobManualRunner;
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
import org.springframework.data.domain.PageRequest;
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
    private final JobManualRunner jobManualRunner;
    private final ScheduledJobRunRepository scheduledJobRunRepository;

    public Result<WorkerJobsOverviewResp> overview() {
        List<ScheduledJobResp> scheduled = new ArrayList<>();
        jobCatalog.list().forEach(job -> scheduled.add(new ScheduledJobResp(
            job.jobId(),
            "studio",
            job.initialDelayMs(),
            job.fixedDelayMs()
        )));

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
            throw WorkerExceptions.jobTypeRequired();
        }
        if (req.itemIds() == null || req.itemIds().isEmpty()) {
            throw WorkerExceptions.itemIdsRequired();
        }
        boolean supported = batchJobHandlers.stream().anyMatch(h -> h.supports(req.jobType()));
        if (!supported) {
            throw WorkerExceptions.unknownJobType(req.jobType());
        }
        BatchJobDispatcher dispatcher = batchJobDispatcher.getIfAvailable();
        if (dispatcher == null) {
            throw WorkerExceptions.mqUnavailable();
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

    public Result<ManualRunResp> runJob(String jobId) {
        if (!jobManualRunner.exists(jobId)) {
            throw WorkerExceptions.unknownJobId(jobId);
        }
        long runId = jobManualRunner.runNow(jobId);
        return ok(new ManualRunResp(runId));
    }

    public Result<List<ScheduledJobRunResp>> jobRuns(String jobId, int limit) {
        if (!jobManualRunner.exists(jobId)) {
            throw WorkerExceptions.unknownJobId(jobId);
        }
        int capped = Math.max(1, Math.min(limit, 100));
        List<ScheduledJobRunResp> runs = scheduledJobRunRepository
            .findByJobIdOrderByStartedAtDesc(jobId, PageRequest.of(0, capped))
            .stream()
            .map(WorkerCrmJobsBiz::toRunResp)
            .toList();
        return ok(runs);
    }

    private static ScheduledJobRunResp toRunResp(ScheduledJobRunEntity entity) {
        return new ScheduledJobRunResp(
            entity.getId(),
            entity.getJobId(),
            entity.getTriggerType(),
            entity.getStatus(),
            entity.getStartedAt(),
            entity.getFinishedAt(),
            entity.getErrorMessage(),
            entity.getInstanceId()
        );
    }
}
