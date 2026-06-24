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
@Table(name = "ai_model_credential")
@Getter
@Setter
public class AiModelCredentialEntity {

    @Id
    @Column(length = 36, nullable = false)
    private String id;

    @Column(name = "model_type", nullable = false, length = 16)
    private String modelType;

    @Column(nullable = false, length = 120)
    private String label;

    @Column(nullable = false, length = 32)
    private String provider;

    @Column(nullable = false, length = 16)
    private String protocol;

    @Column(name = "base_url", nullable = false, length = 512)
    private String baseUrl;

    @Column(name = "api_key_enc", nullable = false, columnDefinition = "TEXT")
    private String apiKeyEnc;

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
