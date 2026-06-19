package cn.novelstudio.module.billing.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Data
@Entity
@Table(name = "user_quota_override")
public class UserQuotaOverrideEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "token_bonus", nullable = false)
    private Long tokenBonus = 0L;

    @Column(name = "run_bonus", nullable = false)
    private Integer runBonus = 0;

    @Column(name = "rate_limit_rpm")
    private Integer rateLimitRpm;

    /** 私人书库上传额度加成（叠加到 plan_feature.library_upload_limit 的 limit_value）。 */
    @Column(name = "library_upload_bonus")
    private Integer libraryUploadBonus;

    @Column(columnDefinition = "text")
    private String reason;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "created_by")
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
