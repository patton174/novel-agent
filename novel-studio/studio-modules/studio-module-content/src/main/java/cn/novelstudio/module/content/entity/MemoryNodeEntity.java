package cn.novelstudio.module.content.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.io.Serializable;
import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "memory_node")
@IdClass(MemoryNodeEntity.MemoryNodeId.class)
@Getter
@Setter
@NoArgsConstructor
public class MemoryNodeEntity {

    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Id
    @Column(name = "novel_id", nullable = false, length = 64)
    private String novelId;

    @Id
    @Column(name = "id", nullable = false, length = 64)
    private String id;

    @Column(name = "scope", nullable = false, length = 32)
    private String scope;

    @Column(name = "parent_id", length = 64)
    private String parentId;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "title", nullable = false, length = 512)
    private String title;

    @Column(name = "node_kind", nullable = false, length = 16)
    private String nodeKind = "both";

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "style", columnDefinition = "jsonb")
    private Map<String, Object> style;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "meta", columnDefinition = "jsonb")
    private Map<String, Object> meta;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touchTimestamps() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class MemoryNodeId implements Serializable {
        private Long userId;
        private String novelId;
        private String id;

        public MemoryNodeId(Long userId, String novelId, String id) {
            this.userId = userId;
            this.novelId = novelId;
            this.id = id;
        }
    }
}
