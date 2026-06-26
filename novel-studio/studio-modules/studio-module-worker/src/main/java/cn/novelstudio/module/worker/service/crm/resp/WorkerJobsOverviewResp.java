package cn.novelstudio.module.worker.service.crm.resp;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.Map;

public record WorkerJobsOverviewResp(
    List<ScheduledJobResp> scheduled,
    List<MqConsumerResp> mqConsumers,
    List<BatchJobTypeResp> batchJobTypes,
    JobsRuntimeMeta meta
) {
    public record ScheduledJobResp(
        String jobId,
        String source,
        long initialDelayMs,
        long fixedDelayMs
    ) {
    }

    public record MqConsumerResp(
        String id,
        String queue,
        String exchange,
        String routingKey
    ) {
    }

    public record BatchJobTypeResp(String jobType, String handler) {
    }

    public record BatchDispatchReq(
        @NotBlank(message = "{batch.job_type_required}") String jobType,
        @NotEmpty(message = "{batch.item_ids_required}") List<String> itemIds,
        Map<String, String> attributes
    ) {
    }

    public record JobsRuntimeMeta(
        boolean schedulingEnabled,
        boolean batchDispatchAvailable,
        long schedulingLockSeconds
    ) {
    }
}
