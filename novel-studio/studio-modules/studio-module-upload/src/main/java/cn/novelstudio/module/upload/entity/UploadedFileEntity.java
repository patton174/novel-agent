package cn.novelstudio.module.upload.entity;

import cn.novelstudio.kernel.tools.IdWorker;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/** 通用上传文件元数据：落盘后 pending → parsing → ready|failed。 */
@Entity
@Table(name = "uploaded_file")
@Getter
@Setter
public class UploadedFileEntity {

    @Id
    @Column(length = 36, nullable = false)
    private String id;

    @Column(name = "owner_id")
    private Long ownerId;

    @Column(name = "owner_type", nullable = false, length = 16)
    private String ownerType;

    @Column(name = "original_name", nullable = false, length = 255)
    private String originalName;

    @Column(name = "storage_key", nullable = false, length = 512)
    private String storageKey;

    @Column(name = "mime_type", length = 128)
    private String mimeType;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Column(nullable = false, length = 16)
    private String format;

    @Column(nullable = false, length = 16)
    private String status;

    @Column(name = "parse_error", columnDefinition = "TEXT")
    private String parseError;

    @Column(name = "catalog_novel_id", length = 36)
    private String catalogNovelId;

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
