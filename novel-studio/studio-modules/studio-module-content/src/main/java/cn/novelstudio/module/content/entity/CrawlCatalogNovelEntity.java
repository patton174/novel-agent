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

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** null=公共书库条目（爬虫）；数值=用户私人书库（上传入库）。 */
    @Column(name = "owner_id")
    private Long ownerId;

    /** 来源：crawl（爬虫公共）| upload（用户/管理员上传）。 */
    @Column(nullable = false, length = 16)
    private String source = "crawl";

    /** 上传入库时关联的 uploaded_file.id（唯一，仅 upload 来源有值）。 */
    @Column(name = "uploader_file_id", length = 36)
    private String uploaderFileId;

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
