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
@Table(name = "chapter")
@Getter
@Setter
public class ChapterEntity {

    @Id
    @Column(length = 36, nullable = false)
    private String id;

    @Column(name = "novel_id", nullable = false, length = 36)
    private String novelId;

    @Column(name = "volume_id", length = 36)
    private String volumeId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Column(name = "word_count")
    private Integer wordCount;

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
        if (content == null) {
            content = "";
        }
        if (sortOrder == null) {
            sortOrder = 0;
        }
        wordCount = countWords(content);
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
        wordCount = countWords(content);
    }

    public static int countWords(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        return text.replaceAll("\\s+", "").length();
    }
}
