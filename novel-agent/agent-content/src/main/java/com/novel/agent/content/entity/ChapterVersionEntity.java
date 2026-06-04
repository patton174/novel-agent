package com.novel.agent.content.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "chapter_version")
@Getter
@Setter
public class ChapterVersionEntity {

    @Id
    @Column(length = 36, nullable = false)
    private String id;

    @Column(name = "chapter_id", nullable = false, length = 36)
    private String chapterId;

    @Column(name = "novel_id", nullable = false, length = 36)
    private String novelId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "word_count")
    private Integer wordCount;

    @Column(length = 16)
    private String source;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (content == null) {
            content = "";
        }
        wordCount = ChapterEntity.countWords(content);
    }
}
