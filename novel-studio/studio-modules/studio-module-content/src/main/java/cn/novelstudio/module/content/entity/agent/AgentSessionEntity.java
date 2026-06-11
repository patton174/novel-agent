package cn.novelstudio.module.content.entity.agent;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "agent_session")
@Getter
@Setter
public class AgentSessionEntity {

    @Id
    @Column(length = 64, nullable = false)
    private String id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "novel_id", length = 64)
    private String novelId;

    @Column(length = 256)
    private String title;

    @Column(nullable = false, length = 32)
    private String status = "active";

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
