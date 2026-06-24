package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.AiModelCredentialEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AiModelCredentialRepository extends JpaRepository<AiModelCredentialEntity, String> {

    List<AiModelCredentialEntity> findByModelTypeOrderByCreatedAtAsc(String modelType);
}
