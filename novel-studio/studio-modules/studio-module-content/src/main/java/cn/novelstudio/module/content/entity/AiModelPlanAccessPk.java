package cn.novelstudio.module.content.entity;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class AiModelPlanAccessPk implements Serializable {

    private String modelId;
    private String planCode;
}
