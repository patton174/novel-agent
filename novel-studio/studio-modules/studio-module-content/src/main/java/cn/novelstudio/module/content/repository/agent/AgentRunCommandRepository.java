package cn.novelstudio.module.content.repository.agent;

import cn.novelstudio.module.content.entity.agent.AgentRunCommandEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AgentRunCommandRepository extends JpaRepository<AgentRunCommandEntity, String> {

    Optional<AgentRunCommandEntity> findByRunIdAndId(String runId, String id);
}
