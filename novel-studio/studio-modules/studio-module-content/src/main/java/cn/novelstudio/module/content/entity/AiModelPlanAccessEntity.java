package cn.novelstudio.module.content.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "ai_model_plan_access")
@IdClass(AiModelPlanAccessPk.class)
@Getter
@Setter
public class AiModelPlanAccessEntity {

    @Id
    @Column(name = "model_id", length = 36)
    private String modelId;

    @Id
    @Column(name = "plan_code", length = 32)
    private String planCode;
}
