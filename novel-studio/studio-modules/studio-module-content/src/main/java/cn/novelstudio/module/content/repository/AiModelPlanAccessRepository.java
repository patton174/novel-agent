package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.AiModelPlanAccessEntity;
import cn.novelstudio.module.content.entity.AiModelPlanAccessPk;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AiModelPlanAccessRepository extends JpaRepository<AiModelPlanAccessEntity, AiModelPlanAccessPk> {

    List<AiModelPlanAccessEntity> findByModelId(String modelId);

    void deleteByModelId(String modelId);

    List<AiModelPlanAccessEntity> findByPlanCode(String planCode);
}
