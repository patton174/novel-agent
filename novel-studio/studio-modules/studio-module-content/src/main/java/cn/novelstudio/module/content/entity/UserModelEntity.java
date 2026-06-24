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

import java.time.Instant;

@Entity
@Table(name = "user_model")
@Getter
@Setter
public class UserModelEntity {

    @Id
    @Column(length = 36, nullable = false)
    private String id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "model_type", nullable = false, length = 16)
    private String modelType = "llm";

    @Column(name = "public_model_id", length = 36)
    private String publicModelId;

    @Column(length = 120)
    private String label;

    @Column(length = 32)
    private String provider;

    @Column(length = 16)
    private String protocol;

    @Column(name = "model_name", length = 120)
    private String modelName;

    @Column(name = "base_url", length = 512)
    private String baseUrl;

    @Column(name = "credential_id", length = 36)
    private String credentialId;

    @Column(name = "api_key_enc", columnDefinition = "TEXT")
    private String apiKeyEnc;

    @Column(name = "is_byok", nullable = false)
    private Boolean byok = false;

    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;

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
