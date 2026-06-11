package cn.novelstudio.module.content.entity.agent;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "agent_run_command")
@Getter
@Setter
public class AgentRunCommandEntity {

    @Id
    @Column(length = 64, nullable = false)
    private String id;

    @Column(name = "run_id", nullable = false, length = 64)
    private String runId;

    @Column(name = "command_type", nullable = false, length = 32)
    private String commandType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
