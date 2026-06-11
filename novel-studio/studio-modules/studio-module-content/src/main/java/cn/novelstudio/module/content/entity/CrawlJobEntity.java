package cn.novelstudio.module.content.entity;

import cn.novelstudio.module.content.crawl.CrawlJobStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import cn.novelstudio.kernel.tools.IdWorker;

@Entity
@Table(name = "crawl_job")
@Getter
@Setter
public class CrawlJobEntity {

    @Id
    @Column(length = 36, nullable = false)
    private String id;

    @Column(name = "source_url", nullable = false, length = 1024)
    private String sourceUrl;

    @Column(name = "site_id", length = 36)
    private String siteId;

    @Column(length = 200)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private CrawlJobStatus status = CrawlJobStatus.PENDING;

    @Column(name = "target_user_id")
    private Long targetUserId;

    @Column(name = "created_by_admin_id")
    private Long createdByAdminId;

    @Column(name = "catalog_novel_id", length = 36)
    private String catalogNovelId;

    @Column(name = "chapters_total")
    private Integer chaptersTotal;

    @Column(name = "chapters_done")
    private Integer chaptersDone;

    @Column(name = "config_json", columnDefinition = "TEXT")
    private String configJson;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

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
        if (chaptersDone == null) {
            chaptersDone = 0;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
