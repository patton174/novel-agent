package cn.novelstudio.platform.scheduling;

import cn.novelstudio.kernel.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ScheduledJobConfigService {

    private static final Logger log = LoggerFactory.getLogger(ScheduledJobConfigService.class);

    private final ScheduledJobConfigRepository repository;
    private final StringRedisTemplate redis;
    private final StudioJobCatalog jobCatalog;
    private final StudioJobRegistrar registrar;

    public Optional<ScheduledJobConfigDto> getConfig(String jobId) {
        requireKnownJob(jobId);
        Optional<ScheduledJobConfigEntity> stored = repository.findById(jobId);
        StudioJobCatalog.StudioJobDescriptor defaults = jobCatalog.list().stream()
            .filter(job -> job.jobId().equals(jobId))
            .findFirst()
            .orElseThrow(() -> ValidationException.keyed("jobs.unknown_job_id", jobId));

        if (stored.isEmpty()) {
            return Optional.of(ScheduledJobConfigDto.fromDefaults(jobId, defaults));
        }
        return Optional.of(ScheduledJobConfigDto.fromEntity(stored.get(), defaults));
    }

    @Transactional
    public ScheduledJobConfigDto saveConfig(String jobId, ScheduledJobConfigSaveReq req, Long updatedBy) {
        requireKnownJob(jobId);
        validateSaveReq(req);

        StudioJobCatalog.StudioJobDescriptor defaults = jobCatalog.list().stream()
            .filter(job -> job.jobId().equals(jobId))
            .findFirst()
            .orElseThrow(() -> ValidationException.keyed("jobs.unknown_job_id", jobId));

        ScheduledJobConfigEntity entity = repository.findById(jobId).orElseGet(ScheduledJobConfigEntity::new);
        entity.setJobId(jobId);
        entity.setEnabled(req.enabled());
        entity.setScheduleType(ScheduleType.fromDbValue(req.scheduleType()).dbValue());
        entity.setFixedDelayMs(req.fixedDelayMs());
        entity.setCronExpression(normalizeBlank(req.cronExpression()));
        entity.setInitialDelayMs(req.initialDelayMs());
        entity.setUpdatedBy(updatedBy);
        entity.setUpdatedAt(Instant.now());

        ScheduledJobConfigEntity saved = repository.save(entity);
        publishReload();
        log.info("saved scheduled job config for {} by user {}", jobId, updatedBy);
        return ScheduledJobConfigDto.fromEntity(saved, defaults);
    }

    public void publishReload() {
        redis.convertAndSend(SchedulingRedisKeys.JOBS_RELOAD_CHANNEL, "reload");
        registrar.reload();
    }

    public Optional<ScheduledJobConfigEntity> findStoredConfig(String jobId) {
        return repository.findById(jobId);
    }

    private void requireKnownJob(String jobId) {
        if (jobId == null || jobId.isBlank()) {
            throw ValidationException.keyed("jobs.job_id_required");
        }
        boolean known = jobCatalog.list().stream().anyMatch(job -> job.jobId().equals(jobId));
        if (!known) {
            throw ValidationException.keyed("jobs.unknown_job_id", jobId);
        }
    }

    private void validateSaveReq(ScheduledJobConfigSaveReq req) {
        if (req == null) {
            throw ValidationException.keyed("jobs.config_required");
        }
        ScheduleType scheduleType = ScheduleType.fromDbValue(req.scheduleType());
        if (scheduleType == ScheduleType.CRON) {
            String cron = normalizeBlank(req.cronExpression());
            if (cron == null) {
                throw ValidationException.keyed("jobs.cron_expression_required");
            }
            if (!CronExpression.isValidExpression(cron)) {
                throw ValidationException.keyed("jobs.cron_expression_invalid", cron);
            }
        } else if (req.fixedDelayMs() != null && req.fixedDelayMs() <= 0) {
            throw ValidationException.keyed("jobs.fixed_delay_invalid");
        }
        if (req.initialDelayMs() != null && req.initialDelayMs() < 0) {
            throw ValidationException.keyed("jobs.initial_delay_invalid");
        }
    }

    private static String normalizeBlank(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    public record ScheduledJobConfigDto(
        String jobId,
        boolean enabled,
        String scheduleType,
        Long fixedDelayMs,
        String cronExpression,
        Long initialDelayMs,
        long defaultInitialDelayMs,
        long defaultFixedDelayMs,
        Long updatedBy,
        Instant updatedAt,
        boolean persisted
    ) {
        static ScheduledJobConfigDto fromDefaults(String jobId, StudioJobCatalog.StudioJobDescriptor defaults) {
            return new ScheduledJobConfigDto(
                jobId,
                true,
                ScheduleType.FIXED_DELAY.dbValue(),
                defaults.fixedDelayMs(),
                null,
                defaults.initialDelayMs(),
                defaults.initialDelayMs(),
                defaults.fixedDelayMs(),
                null,
                null,
                false
            );
        }

        static ScheduledJobConfigDto fromEntity(
            ScheduledJobConfigEntity entity,
            StudioJobCatalog.StudioJobDescriptor defaults
        ) {
            return new ScheduledJobConfigDto(
                entity.getJobId(),
                entity.isEnabled(),
                entity.getScheduleType(),
                entity.getFixedDelayMs(),
                entity.getCronExpression(),
                entity.getInitialDelayMs(),
                defaults.initialDelayMs(),
                defaults.fixedDelayMs(),
                entity.getUpdatedBy(),
                entity.getUpdatedAt(),
                true
            );
        }
    }

    public record ScheduledJobConfigSaveReq(
        boolean enabled,
        String scheduleType,
        Long fixedDelayMs,
        String cronExpression,
        Long initialDelayMs
    ) {
    }
}
