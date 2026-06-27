package cn.novelstudio.module.content.entity.agent;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "crew_run")
@Getter
@Setter
public class CrewRunEntity {

    @Id
    @Column(nullable = false)
    private UUID id;

    @Column(name = "crew_template_id", nullable = false, length = 64)
    private String crewTemplateId;

    @Column(name = "session_id", nullable = false, length = 64)
    private String sessionId;

    @Column(name = "root_run_id", nullable = false, length = 64)
    private String rootRunId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "current_stage_key", length = 64)
    private String currentStageKey;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "stage_outputs_json", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> stageOutputsJson = new HashMap<>();

    @Column(nullable = false, length = 16)
    private String status = "running";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
