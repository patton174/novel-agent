package cn.novelstudio.module.content.repository.agent;

import cn.novelstudio.module.content.entity.agent.AgentProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AgentProfileRepository extends JpaRepository<AgentProfileEntity, String> {

    List<AgentProfileEntity> findByUserIdOrIsSystemTrueOrderByDisplayNameAsc(Long userId);

    Optional<AgentProfileEntity> findByIdAndIsSystemTrue(String id);

    Optional<AgentProfileEntity> findByIdAndUserId(String id, Long userId);
}
