package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.AiModelEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AiModelRepository extends JpaRepository<AiModelEntity, String> {

    List<AiModelEntity> findByModelTypeAndActiveTrue(String modelType);

    Optional<AiModelEntity> findByCode(String code);

    Optional<AiModelEntity> findFirstByModelTypeAndIsDefaultTrueAndActiveTrue(String modelType);

    Optional<AiModelEntity> findFirstByModelTypeAndActiveTrueOrderBySortOrderAsc(String modelType);

    long countByCredentialId(String credentialId);

    List<AiModelEntity> findByCredentialId(String credentialId);
}
