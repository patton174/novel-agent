package cn.novelstudio.module.content.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import cn.novelstudio.kernel.tools.IdWorker;

@Entity
@Table(name = "crawl_catalog_chapter")
@Getter
@Setter
public class CrawlCatalogChapterEntity {

    @Id
    @Column(length = 36, nullable = false)
    private String id;

    @Column(name = "catalog_novel_id", nullable = false, length = 36)
    private String catalogNovelId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Column(name = "source_url", length = 1024)
    private String sourceUrl;

    @Column(name = "word_count")
    private Integer wordCount;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null || id.isBlank()) {
            id = IdWorker.nextIdStr();
        }
        createdAt = Instant.now();
        if (wordCount == null && content != null) {
            wordCount = content.length();
        }
    }
}
