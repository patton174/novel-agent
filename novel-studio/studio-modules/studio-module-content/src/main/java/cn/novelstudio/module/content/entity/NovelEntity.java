package cn.novelstudio.module.content.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import cn.novelstudio.kernel.tools.IdWorker;

@Entity
@Table(name = "novel")
@Getter
@Setter
public class NovelEntity {

    @Id
    @Column(length = 36, nullable = false)
    private String id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 64)
    private String genre;

    @Column(length = 64)
    private String style;

    @Column(name = "target_chapter_words")
    private Integer targetChapterWords;

    /** AI 生成的封面图 URL（Agnes 返回的公网地址） */
    @Column(name = "cover_url", length = 1024)
    private String coverUrl;

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
        if (targetChapterWords == null) {
            targetChapterWords = 3000;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
