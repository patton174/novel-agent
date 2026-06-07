package com.novel.agent.content.entity;

import com.novel.agent.content.crawl.CrawlJobStatus;
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
import com.novel.agent.common.core.tools.IdWorker;

@Entity
@Table(name = "crawl_site")
@Getter
@Setter
public class CrawlSiteEntity {

    @Id
    @Column(length = 36, nullable = false)
    private String id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "base_url", length = 512)
    private String baseUrl;

    @Column(name = "config_json", columnDefinition = "TEXT")
    private String configJson;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(length = 500)
    private String remark;

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
