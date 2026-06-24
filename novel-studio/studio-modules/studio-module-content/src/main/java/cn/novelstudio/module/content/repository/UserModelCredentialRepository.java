package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.UserModelCredentialEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserModelCredentialRepository extends JpaRepository<UserModelCredentialEntity, String> {

    List<UserModelCredentialEntity> findByUserIdOrderByCreatedAtAsc(Long userId);

    long countByUserId(Long userId);
}
