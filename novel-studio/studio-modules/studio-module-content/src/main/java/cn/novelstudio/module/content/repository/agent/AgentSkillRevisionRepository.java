package cn.novelstudio.module.content.repository.agent;

import cn.novelstudio.module.content.entity.agent.AgentSkillRevisionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AgentSkillRevisionRepository extends JpaRepository<AgentSkillRevisionEntity, UUID> {

    Optional<AgentSkillRevisionEntity> findBySkillIdAndVersion(UUID skillId, int version);
}
