package cn.novelstudio.module.content.entity.agent;

import cn.novelstudio.module.content.agent.AgentRunStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "agent_run")
@Getter
@Setter
public class AgentRunEntity {

    @Id
    @Column(length = 64, nullable = false)
    private String id;

    @Column(name = "session_id", nullable = false, length = 64)
    private String sessionId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "user_message_id", nullable = false, length = 64)
    private String userMessageId;

    @Column(name = "assistant_message_id", length = 64)
    private String assistantMessageId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private AgentRunStatus status;

    @Column(length = 32)
    private String mode;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "worker_id", length = 64)
    private String workerId;

    @Column(name = "lease_expires_at")
    private Instant leaseExpiresAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
