package cn.novelstudio.module.billing.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Data
@Entity
@Table(name = "site_content")
public class SiteContentEntity {

    @EmbeddedId
    private SiteContentId id;

    @Column(nullable = false, length = 256)
    private String title;

    @Column(name = "body_md", nullable = false, columnDefinition = "text")
    private String bodyMd;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "updated_by")
    private Long updatedBy;

    public String getContentKey() {
        return id == null ? null : id.getContentKey();
    }

    public String getLocale() {
        return id == null ? null : id.getLocale();
    }
}
