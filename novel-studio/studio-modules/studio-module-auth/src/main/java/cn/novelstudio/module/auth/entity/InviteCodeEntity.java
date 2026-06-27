package cn.novelstudio.module.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Data
@Entity
@Table(name = "invite_code")
public class InviteCodeEntity {

    @Id
    private Long id;

    @Column(nullable = false, unique = true, length = 32)
    private String code;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "max_uses", nullable = false)
    private Integer maxUses = 1;

    @Column(name = "used_count", nullable = false)
    private Integer usedCount = 0;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "reward_type", nullable = false, length = 32)
    private String rewardType = "none";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "reward_payload", columnDefinition = "jsonb")
    private String rewardPayload;

    @Column(nullable = false, length = 16)
    private String status = "active";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
