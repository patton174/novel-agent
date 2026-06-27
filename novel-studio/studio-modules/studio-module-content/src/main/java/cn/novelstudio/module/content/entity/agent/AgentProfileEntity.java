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
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "agent_profile")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
public class AgentProfileEntity {

    @Id
    @Column(length = 64, nullable = false)
    private String id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "display_name", nullable = false, length = 128)
    private String displayName;

    @Column(length = 512)
    private String description;

    @Column(name = "system_prompt_template", nullable = false, columnDefinition = "TEXT")
    private String systemPromptTemplate;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tool_allowlist_json", nullable = false, columnDefinition = "jsonb")
    private List<String> toolAllowlistJson = new ArrayList<>();

    @Column(name = "model_override", length = 64)
    private String modelOverride;

    @Column(name = "max_turns", nullable = false)
    private Integer maxTurns = 20;

    @Column(name = "max_output_tokens")
    private Integer maxOutputTokens;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "skill_ids_json", nullable = false, columnDefinition = "jsonb")
    private List<String> skillIdsJson = new ArrayList<>();

    @Column(name = "is_system", nullable = false)
    private Boolean isSystem = false;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
