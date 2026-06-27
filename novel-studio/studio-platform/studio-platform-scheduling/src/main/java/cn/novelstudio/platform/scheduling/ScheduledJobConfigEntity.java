package cn.novelstudio.platform.scheduling;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.Instant;

@Data
@Entity
@Table(name = "scheduled_job_config")
public class ScheduledJobConfigEntity {

    @Id
    @Column(name = "job_id", nullable = false, length = 64)
    private String jobId;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "schedule_type", nullable = false, length = 16)
    private String scheduleType = ScheduleType.FIXED_DELAY.dbValue();

    @Column(name = "fixed_delay_ms")
    private Long fixedDelayMs;

    @Column(name = "cron_expression", length = 128)
    private String cronExpression;

    @Column(name = "initial_delay_ms")
    private Long initialDelayMs;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}
