package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.UserModelEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserModelRepository extends JpaRepository<UserModelEntity, String> {

    List<UserModelEntity> findByUserIdAndModelType(Long userId, String modelType);

    Optional<UserModelEntity> findByUserIdAndModelTypeAndIsDefaultTrue(Long userId, String modelType);

    boolean existsByPublicModelId(String publicModelId);

    long countByCredentialId(String credentialId);

    List<UserModelEntity> findByCredentialId(String credentialId);
}
