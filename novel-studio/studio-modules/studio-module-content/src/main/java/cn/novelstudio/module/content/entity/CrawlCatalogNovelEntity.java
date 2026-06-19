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

/** 爬虫入库的公共书库作品（与用户作品库分离，用户可自行添加） */
@Entity
@Table(name = "crawl_catalog_novel")
@Getter
@Setter
public class CrawlCatalogNovelEntity {

    @Id
    @Column(length = 36, nullable = false)
    private String id;

    @Column(name = "job_id", length = 36)
    private String jobId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 120)
    private String author;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "source_url", length = 1024)
    private String sourceUrl;

    @Column(name = "cover_url", length = 1024)
    private String coverUrl;

    @Column(name = "chapter_count")
    private Integer chapterCount;

    // --- 上传入库扩展字段（Part 2 解析回写使用；Part 1 合并后对齐迁移） ---
    @Column(name = "owner_id")
    private Long ownerId;

    @Column(length = 32)
    private String source;

    @Column(name = "uploader_file_id", length = 36)
    private String uploaderFileId;

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
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
