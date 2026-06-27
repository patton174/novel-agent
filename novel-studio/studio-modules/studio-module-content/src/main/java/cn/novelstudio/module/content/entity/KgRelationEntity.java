package cn.novelstudio.module.content.entity;

import cn.novelstudio.kernel.tools.IdWorker;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "kg_relation",
    uniqueConstraints = @UniqueConstraint(columnNames = {"novel_id", "src_name", "rel", "dst_name"}))
@Getter
@Setter
public class KgRelationEntity {

    @jakarta.persistence.Id
    @Column(length = 36, nullable = false)
    private String id;

    @Column(name = "novel_id", nullable = false, length = 36)
    private String novelId;

    @Column(name = "src_name", nullable = false, length = 120)
    private String srcName;

    @Column(nullable = false, length = 64)
    private String rel;

    @Column(name = "dst_name", nullable = false, length = 120)
    private String dstName;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null || id.isBlank()) {
            id = IdWorker.nextIdStr();
        }
        createdAt = Instant.now();
    }
}
