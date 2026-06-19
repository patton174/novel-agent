package cn.novelstudio.module.billing.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "plan_feature", uniqueConstraints = @UniqueConstraint(columnNames = {"plan_id", "feature_key"}))
public class PlanFeatureEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "plan_id", nullable = false)
    private Long planId;

    @Column(name = "feature_key", nullable = false, length = 64)
    private String featureKey;

    @Column(nullable = false)
    private Boolean enabled = true;

    /** null=布尔特性/不适用；数值=限额（如 library_upload_limit 的上传本数）。 */
    @Column(name = "limit_value")
    private Integer limitValue;
}
