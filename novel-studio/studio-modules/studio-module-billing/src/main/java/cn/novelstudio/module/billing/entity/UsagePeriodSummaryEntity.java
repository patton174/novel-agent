package cn.novelstudio.module.billing.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Data
@Entity
@Table(name = "usage_period_summary")
@IdClass(UsagePeriodSummaryId.class)
public class UsagePeriodSummaryEntity {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Id
    @Column(name = "period_yyyy_mm", length = 7)
    private String periodYyyyMm;

    @Column(name = "tokens_used", nullable = false)
    private Long tokensUsed = 0L;

    @Column(name = "runs_used", nullable = false)
    private Integer runsUsed = 0;

    @Column(name = "cost_micros", nullable = false)
    private Long costMicros = 0L;

    @Column(name = "overage_micros", nullable = false)
    private Long overageMicros = 0L;

    @Column(name = "quota_tokens")
    private Long quotaTokens;

    @Column(name = "quota_runs")
    private Integer quotaRuns;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
