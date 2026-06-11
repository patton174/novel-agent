package cn.novelstudio.module.billing.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Data
@Entity
@Table(name = "site_settings")
public class SiteSettingEntity {

    @Id
    @Column(name = "setting_key", length = 64)
    private String settingKey;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "value_json", nullable = false, columnDefinition = "jsonb")
    private String valueJson;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "updated_by")
    private Long updatedBy;
}
