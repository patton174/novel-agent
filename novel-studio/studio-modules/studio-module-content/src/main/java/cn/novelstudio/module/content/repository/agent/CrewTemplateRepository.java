package cn.novelstudio.module.content.repository.agent;

import cn.novelstudio.module.content.entity.agent.CrewTemplateEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CrewTemplateRepository extends JpaRepository<CrewTemplateEntity, String> {

    List<CrewTemplateEntity> findByUserIdOrIsSystemTrueOrderByDisplayNameAsc(Long userId);

    Optional<CrewTemplateEntity> findByIdAndIsSystemTrue(String id);

    Optional<CrewTemplateEntity> findByIdAndUserId(String id, Long userId);
}
