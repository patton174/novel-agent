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

import java.io.Serializable;
import java.time.Instant;

@Entity
@Table(name = "story_memory")
@IdClass(StoryMemoryEntity.StoryMemoryId.class)
@Getter
@Setter
@NoArgsConstructor
public class StoryMemoryEntity {

    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Id
    @Column(name = "session_id", nullable = false, length = 64)
    private String sessionId;

    @Column(name = "memory_json", nullable = false, columnDefinition = "TEXT")
    private String memoryJson;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public StoryMemoryEntity(Long userId, String sessionId, String memoryJson) {
        this.userId = userId;
        this.sessionId = sessionId;
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
    public static class StoryMemoryId implements Serializable {
        private Long userId;
        private String sessionId;

        public StoryMemoryId(Long userId, String sessionId) {
            this.userId = userId;
            this.sessionId = sessionId;
        }
    }
}
