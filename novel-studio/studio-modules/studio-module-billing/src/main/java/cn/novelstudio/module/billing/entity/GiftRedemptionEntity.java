package cn.novelstudio.module.billing.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "gift_redemption")
@Getter
@Setter
public class GiftRedemptionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "campaign_id", nullable = false)
    private Long campaignId;

    @Column(nullable = false, length = 64, unique = true)
    private String code;

    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false, length = 16)
    private String status = "available";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "fulfillment_json", columnDefinition = "jsonb")
    private Map<String, Object> fulfillmentJson;

    @Column(name = "redeemed_at")
    private Instant redeemedAt;

    @Column(name = "fulfilled_at")
    private Instant fulfilledAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
