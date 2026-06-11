package cn.novelstudio.module.billing.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Data
@Entity
@Table(name = "usage_event")
public class UsageEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "run_id", length = 64)
    private String runId;

    @Column(name = "session_id", length = 64)
    private String sessionId;

    @Column(name = "trace_id", length = 64)
    private String traceId;

    @Column(name = "event_type", nullable = false, length = 32)
    private String eventType;

    @Column(length = 64)
    private String model;

    @Column(name = "input_tokens", nullable = false)
    private Integer inputTokens = 0;

    @Column(name = "output_tokens", nullable = false)
    private Integer outputTokens = 0;

    @Column(name = "cache_read_tokens", nullable = false)
    private Integer cacheReadTokens = 0;

    @Column(name = "cache_write_tokens", nullable = false)
    private Integer cacheWriteTokens = 0;

    @Column(name = "unit_cost_micros", nullable = false)
    private Long unitCostMicros = 0L;

    @Column(name = "total_cost_micros", nullable = false)
    private Long totalCostMicros = 0L;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata_json", columnDefinition = "jsonb")
    private Map<String, Object> metadataJson;

    @Column(name = "idempotency_key", unique = true, length = 128)
    private String idempotencyKey;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
