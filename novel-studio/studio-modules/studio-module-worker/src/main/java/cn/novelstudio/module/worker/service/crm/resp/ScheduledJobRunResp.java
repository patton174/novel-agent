package cn.novelstudio.module.worker.service.crm.resp;

import java.time.Instant;

public record ScheduledJobRunResp(
    long id,
    String jobId,
    String triggerType,
    String status,
    Instant startedAt,
    Instant finishedAt,
    String errorMessage,
    String instanceId
) {
}
