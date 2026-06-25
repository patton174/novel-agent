package cn.novelstudio.module.billing.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "payment_order")
@Getter
@Setter
public class PaymentOrderEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "plan_code", nullable = false, length = 32)
    private String planCode;

    @Column(name = "plan_id")
    private Long planId;

    @Column(name = "plan_name", length = 64)
    private String planName;

    @Column(name = "idr_sku_id", length = 64)
    private String idrSkuId;

    @Column(name = "idr_project_id", length = 64)
    private String idrProjectId;

    @Column(name = "idr_order_id", nullable = false, length = 64, unique = true)
    private String idrOrderId;

    @Column(nullable = false, length = 16)
    private String status = "NEW";

    @Column(name = "pay_method", length = 32)
    private String payMethod;

    @Column(name = "contact_info", nullable = false, length = 120)
    private String contactInfo;

    @Column(name = "amount_cents")
    private Integer amountCents;

    @Column(length = 8)
    private String currency;

    @Column(name = "pay_url", columnDefinition = "TEXT")
    private String payUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "callback_json", columnDefinition = "jsonb")
    private Map<String, Object> callbackJson;

    @Column(name = "paid_at")
    private Instant paidAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
