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
@Table(name = "agent_run_checkpoint")
@Getter
@Setter
public class AgentRunCheckpointEntity {

    @Id
    @Column(name = "run_id", length = 64, nullable = false)
    private String runId;

    @Column(name = "step_index", nullable = false)
    private int stepIndex;

    @Column(name = "last_action", length = 32)
    private String lastAction;

    @Column(name = "context_patch", nullable = false, columnDefinition = "TEXT")
    private String contextPatch = "{}";

    @Column(name = "transcript_ref", length = 128)
    private String transcriptRef;

    @Column(nullable = false)
    private int version = 1;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }
}
