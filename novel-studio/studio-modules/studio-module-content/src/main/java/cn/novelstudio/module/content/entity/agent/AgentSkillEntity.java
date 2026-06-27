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
import java.util.UUID;

@Entity
@Table(name = "agent_skill")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
public class AgentSkillEntity {

    @Id
    @Column(nullable = false)
    private UUID id;

    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false, length = 64)
    private String name;

    @Column(nullable = false)
    private Integer version = 1;

    @Column(length = 512)
    private String description;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tools_json", nullable = false, columnDefinition = "jsonb")
    private List<String> toolsJson = new ArrayList<>();

    @Column(nullable = false, length = 8)
    private String locale = "zh";

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
