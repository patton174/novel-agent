package com.novel.agent.content.entity;

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

import java.io.Serializable;
import java.time.Instant;

@Entity
@Table(name = "novel_story_memory")
@IdClass(NovelStoryMemoryEntity.NovelStoryMemoryId.class)
@Getter
@Setter
@NoArgsConstructor
public class NovelStoryMemoryEntity {

    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Id
    @Column(name = "novel_id", nullable = false, length = 64)
    private String novelId;

    @Column(name = "memory_json", nullable = false, columnDefinition = "TEXT")
    private String memoryJson;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public NovelStoryMemoryEntity(Long userId, String novelId, String memoryJson) {
        this.userId = userId;
        this.novelId = novelId;
        this.memoryJson = memoryJson;
        this.updatedAt = Instant.now();
    }

    @PrePersist
    @PreUpdate
    void touchUpdatedAt() {
        updatedAt = Instant.now();
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class NovelStoryMemoryId implements Serializable {
        private Long userId;
        private String novelId;

        public NovelStoryMemoryId(Long userId, String novelId) {
            this.userId = userId;
            this.novelId = novelId;
        }
    }
}
