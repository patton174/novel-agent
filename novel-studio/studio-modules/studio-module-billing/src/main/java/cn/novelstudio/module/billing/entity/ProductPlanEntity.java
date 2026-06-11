package cn.novelstudio.module.billing.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Data
@Entity
@Table(name = "product_plan")
public class ProductPlanEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 32)
    private String code;

    @Column(nullable = false, length = 64)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "price_cents")
    private Integer priceCents;

    @Column(nullable = false, length = 8)
    private String currency = "CNY";

    @Column(name = "billing_interval", nullable = false, length = 16)
    private String billingInterval = "month";

    @Column(name = "monthly_token_quota")
    private Long monthlyTokenQuota;

    @Column(name = "monthly_run_quota")
    private Integer monthlyRunQuota;

    @Column(name = "rate_limit_rpm", nullable = false)
    private Integer rateLimitRpm = 60;

    @Column(name = "overage_policy", nullable = false, length = 32)
    private String overagePolicy = "block";

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "is_featured", nullable = false)
    private Boolean isFeatured = false;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
