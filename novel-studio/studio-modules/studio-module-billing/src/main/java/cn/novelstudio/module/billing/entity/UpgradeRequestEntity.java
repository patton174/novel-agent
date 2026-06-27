package cn.novelstudio.module.billing.entity;

import cn.novelstudio.kernel.tools.IdWorker;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "upgrade_request")
@Getter
@Setter
public class UpgradeRequestEntity {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "request_type", nullable = false, length = 16)
    private String requestType;

    @Column(name = "target_value", nullable = false, length = 120)
    private String targetValue;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false, length = 16)
    private String status = "pending";

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "review_note", columnDefinition = "TEXT")
    private String reviewNote;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null || id.isBlank()) {
            id = IdWorker.nextIdStr();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
