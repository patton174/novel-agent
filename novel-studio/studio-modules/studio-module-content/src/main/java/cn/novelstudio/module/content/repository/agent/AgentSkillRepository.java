package cn.novelstudio.module.content.repository.agent;

import cn.novelstudio.module.content.entity.agent.AgentSkillEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AgentSkillRepository extends JpaRepository<AgentSkillEntity, UUID> {

    List<AgentSkillEntity> findByUserIdOrIsSystemTrueOrderByNameAsc(Long userId);

    Optional<AgentSkillEntity> findByIdAndUserId(UUID id, Long userId);

    Optional<AgentSkillEntity> findByNameAndUserId(String name, Long userId);

    Optional<AgentSkillEntity> findByNameAndIsSystemTrue(String name);

    List<AgentSkillEntity> findByIsSystemTrueOrderByNameAsc();
}
