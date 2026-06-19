package cn.novelstudio.module.content.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * 上传文件元数据 + 解析状态。
 *
 * <p>本 worktree 为最小桩：仅含解析回写（UploadService.finalizeParse）所需字段。
 * 完整字段、索引与 Flyway 迁移由 Part 1 提供，合并后对齐。
 */
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

    @Column(name = "owner_type", length = 16)
    private String ownerType;

    @Column(name = "original_name", length = 512)
    private String originalName;

    @Column(name = "storage_key", length = 512)
    private String storageKey;

    @Column(length = 16)
    private String status;

    @Column(name = "parse_error", length = 1024)
    private String parseError;

    @Column(name = "catalog_novel_id", length = 36)
    private String catalogNovelId;
}
