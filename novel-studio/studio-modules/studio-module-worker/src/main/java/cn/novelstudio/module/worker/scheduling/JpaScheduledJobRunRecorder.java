package cn.novelstudio.module.worker.scheduling;

import cn.novelstudio.module.worker.entity.ScheduledJobRunEntity;
import cn.novelstudio.module.worker.repository.ScheduledJobRunRepository;
import cn.novelstudio.platform.scheduling.ScheduledJobRunRecorder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class JpaScheduledJobRunRecorder implements ScheduledJobRunRecorder {

    private final ScheduledJobRunRepository repository;

    @Override
    public long recordStart(String jobId, TriggerType triggerType, String instanceId) {
        ScheduledJobRunEntity entity = new ScheduledJobRunEntity();
        entity.setJobId(jobId);
        entity.setTriggerType(triggerType.name().toLowerCase());
        entity.setStatus(Status.RUNNING.name().toLowerCase());
        entity.setStartedAt(Instant.now());
        entity.setInstanceId(instanceId);
        return repository.save(entity).getId();
    }

    @Override
    public void recordSuccess(long runId) {
        repository.findById(runId).ifPresent(entity -> {
            entity.setStatus(Status.SUCCESS.name().toLowerCase());
            entity.setFinishedAt(Instant.now());
            repository.save(entity);
        });
    }

    @Override
    public void recordFailure(long runId, String errorMessage) {
        repository.findById(runId).ifPresent(entity -> {
            entity.setStatus(Status.FAILED.name().toLowerCase());
            entity.setFinishedAt(Instant.now());
            entity.setErrorMessage(truncate(errorMessage));
            repository.save(entity);
        });
    }

    private static String truncate(String message) {
        if (message == null) {
            return null;
        }
        return message.length() <= 2000 ? message : message.substring(0, 2000);
    }
}
