package cn.novelstudio.module.content.entity;

import cn.novelstudio.kernel.tools.IdWorker;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "ai_model")
@Getter
@Setter
public class AiModelEntity {

    @Id
    @Column(length = 36, nullable = false)
    private String id;

    @Column(nullable = false, length = 64, unique = true)
    private String code;

    @Column(name = "display_name", nullable = false, length = 120)
    private String displayName;

    @Column(name = "model_type", nullable = false, length = 16)
    private String modelType;

    @Column(nullable = false, length = 32)
    private String provider;

    @Column(nullable = false, length = 16)
    private String protocol;

    @Column(name = "model_name", nullable = false, length = 120)
    private String modelName;

    @Column(name = "base_url", nullable = false, length = 512)
    private String baseUrl;

    @Column(name = "credential_id", length = 36)
    private String credentialId;

    @Column(name = "api_key_enc", columnDefinition = "TEXT")
    private String apiKeyEnc;

    @Column(name = "max_tokens")
    private Integer maxTokens;

    private Double temperature;

    @Column(name = "input_price_per_1k_micros")
    private Long inputPricePer1kMicros;

    @Column(name = "output_price_per_1k_micros")
    private Long outputPricePer1kMicros;

    @Column(name = "price_multiplier", nullable = false, precision = 6, scale = 3)
    private BigDecimal priceMultiplier = BigDecimal.ONE;

    @Column(name = "is_active", nullable = false)
    private Boolean active = true;

    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(columnDefinition = "TEXT")
    private String description;

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
