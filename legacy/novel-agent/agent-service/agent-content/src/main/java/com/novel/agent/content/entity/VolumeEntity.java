package com.novel.agent.content.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import com.novel.agent.common.core.tools.IdWorker;

@Entity
@Table(name = "volume")
@Getter
@Setter
public class VolumeEntity {

    @Id
    @Column(length = 36, nullable = false)
    private String id;

    @Column(name = "novel_id", nullable = false, length = 36)
    private String novelId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null || id.isBlank()) {
            id = IdWorker.nextIdStr();
        }
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (sortOrder == null) {
            sortOrder = 1;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
